x <- seq(-4, 4, by=0.1)
y <- exp(x)
M <- cbind(x,y)
colnames(M) <- c('x','y')

dist.x <- as.matrix(dist(x))
rownames(dist.x) <- x
colnames(dist.x) <- x
dist.y <- as.matrix(dist(y))
rownames(dist.y) <- y
colnames(dist.y) <- y


json <- jsonlite::toJSON(list(
  D = list(
    x = dist.x,
    y = dist.y
  ),
  rownames = list(
    x = x,
    y = y
  ),
  leafs = list(
    vis = list(
      x = 'text',
      y = 'text'
    ),
    space = list(
      x = x,
      y = y
    )
  ),
  tooltips = list(
    vis = list(
      x = 'text',
      y = 'text'
    ),
    space = list(
      x = x,
      y = y
    )
  )
),
auto_unbox = T)


setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'exp.json')
