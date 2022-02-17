#############################################################################
# Babar, lightweight cli bar charts
#############################################################################

# repeat a character x times
tc = (x, c) -> Array(x + 1).join c

# ensure value between 2 extremes
minMax = (min, max, val) -> Math.max min, Math.min max, val

# get minX, maxX, minY, maxY, and # of unique x values from points
pointsMinMaxUniqueX = (points) ->
  valX = []

  [minX, maxX, minY, maxY] = points.reduce (prev, point) ->
    valX.push point[0] unless point[0] in valX
    [
      Math.min(prev[0], point[0]), Math.max(prev[1], point[0])
      Math.min(prev[2], point[1]), Math.max(prev[3], point[1])
    ]
  , [Infinity, -Infinity, Infinity, -Infinity]

  {minX, maxX, minY, maxY, uniqueX: valX.length}

# draw row label part
drawRowLabel = (r, lblY, lblYW) ->
  lbl = if r is 0 or lblY[r] isnt lblY[r - 1] then lblY[r] else ''
  "#{tc lblYW - lbl.length - 1, ' '}#{lbl}"

# draw row chart part
drawRowChart = (r, bkt, bktW, c, g, h) ->
  (for v in bkt
    switch ((r > v) and 1) or ((r >= v - 0.25) and 2) or ((r > v - 0.75) and 3) or 4
      when 1 # row is over bar
        if c is 'ascii'
          tc bktW, ' '
        else
          tc bktW, '_'[g]
      when 2 # row is top of bar
        if c is 'ascii'
          tc bktW, ' '
        else
          tc(Math.max(1, bktW - 1), '_'[c]) +
            if bktW > 1 then '_'[g] else ''
      when 3 # row is less than half into the bar
        if c is 'ascii'
          tc bktW, ' '
        else
          tc(Math.max(1, bktW - 1), '▄'[c]) +
            if bktW > 1 then '_'[g] else ''
      when 4 # row is in bar
        if c is 'ascii'
          tc bktW, 'X'
        else
          tc(Math.max(1, bktW - 1), ' '[c].inverse) +
            if bktW > 1 then '_'[g] else ''
  ).join ''

# draw full row
drawRow = (r, lblY, lblYW, bkt, bktW, c, g, h) ->
  "#{drawRowLabel r, lblY, lblYW} #{drawRowChart r, bkt, bktW, c, g, h}"

# draw chart minus x labels
drawChart = (h, lblY, lblYW, bkt, bktW, c, g) ->
  (drawRow r, lblY, lblYW, bkt, bktW, c, g, h for r in [h - 1..0]).join '\n'

# put points in buckets
createBkt = (points, numBkts, minX, diffX) ->
  bkt = []
  for p in points
    [x, y] = p
    u = Math.min numBkts - 1, Math.floor (x - minX) / diffX * numBkts
    bkt[u] ?= []
    bkt[u].push p
  (bkt[i] = [] unless bkt[i]) for i in [0...bkt.length]
  bkt

# average points in buckets
avgBkt = (bkt) ->
  prev = 0
  for values in bkt
    if values.length
      prev = 1 / values.length * values.reduce (prev, curr) ->
        prev + curr[1]
      , 0
    else
      prev

# min max values from buckets
minMaxBkt = (bkt) ->
  {min: Math.min.apply(null, bkt), max: Math.max.apply(null, bkt)}

# normalize buckets
normalizeBkt = (bkt, min, diff, h) -> ((v - min) / diff * h for v in bkt)

# put points in buckets
bucketize = (points, numBkts, minX, diffX, minY, maxY, h) ->
  bkt = avgBkt createBkt points, numBkts, minX, diffX
  {min, max} = minMaxBkt bkt
  if maxY?
    max = maxY
  if minY?
    min = minY
  diff = max - min
  {bkt: normalizeBkt(bkt, min, diff, h - 1), min, max, diff}

# expose main func
module.exports = (points, options={}) ->
  [caption, color, grid, width, height, xFractions, yFractions, minX, maxX, minY, maxY] = [
    options.caption
    options.color ? 'cyan'
    options.grid ? 'black'
    options.width ? 80
    options.height ? 15
    options.xFractions
    options.yFractions
    options.minX
    options.maxX
    options.minY
    options.maxY
  ]

  require 'colors' unless color is 'ascii'

  {minX, maxX, minY, maxY, uniqueX} = pointsMinMaxUniqueX points
  if options.minX?
    minX = options.minX
  if options.maxX?
    maxX = options.maxX
  if options.minY?
    minY = options.minY
  if options.maxY?
    maxY = options.maxY
  [diffX, diffY] = [maxX - minX, maxY - minY]

  # real height of graph
  height -= 1 + !!caption

  # guess best y fraction length
  yFractions ?= minMax 0, 8, Math.log(height / diffY * 5) / Math.LN10

  # max label width
  lblYW = 1 + Math.max minY.toFixed(yFractions).length,
                       maxY.toFixed(yFractions).length

  # real width of graph
  width -= lblYW

  # optimum buckets length and width
  numBkts = Math.min uniqueX, width
  bktW = Math.floor width / numBkts

  # guess best x fraction length
  xFractions ?= minMax 0, 8, Math.log(numBkts / diffX * 5) / Math.LN10

  # fill buckets
  {bkt, min, max, diff} = bucketize points, numBkts, minX, diffX, minY, maxY, height

  lblY = []

  # prerender y labels
  for v in [height - 1..0]
    lbl = (min + diff * v / (height - 1)).toFixed yFractions
    lblY.unshift lbl

  # compute x labels length and incrementor
  lblXW = 0

  for u in [0...numBkts]
    lbl = (minX + u * diffX / (numBkts - 1)).toFixed xFractions
    lblXW = Math.max lblXW, lbl.length

  lblXN = numBkts
  lblXI = 1

  # + 1 to have at least one space between label
  while (lblXN + 1) * lblXW >= numBkts * bktW
    lblXN = Math.floor lblXN / 2
    lblXI *= 2

  out = ''

  # render caption
  if caption?
    out += tc lblYW, ' '
    out += if color is 'ascii' then caption else caption.bold
    out += '\n'

  # render chart
  out += drawChart(height, lblY, lblYW, bkt, bktW, color, grid) + '\n'

  out += tc lblYW, ' '

  # render x labels
  for x in [0...lblXN]
    u = x * lblXI
    lbl = (minX + u * diffX / (numBkts - 1)).toFixed xFractions
    out += lbl
    out += tc bktW * lblXI - lbl.length, ' '

  out
