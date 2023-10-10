x <- seq(-4, 4, by=0.25)
z <- seq(-4 ,4, by=0.25)

M <- expand.grid(x,z)
M <- cbind(M, M[,1]*M[,1]*M[,2])
colnames(M) <- c('x','z','y')

dist.x <- as.matrix(dist(M$x))
rownames(dist.x) <- M$x
colnames(dist.x) <- M$x
dist.z <- as.matrix(dist(M$z))
rownames(dist.z) <- M$z
colnames(dist.z) <- M$z
dist.y <- as.matrix(dist(M$y))
rownames(dist.y) <- M$y
colnames(dist.y) <- M$y


json <- jsonlite::toJSON(list(
  D = list(
    x = dist.x,
    y = dist.y,
    z = dist.z
  ),
  rownames = list(
    x = M$x,
    y = M$y,
    z = M$z
  ),
  leafs = list(
    vis = list(
      x = 'text',
      y = 'text',
      z = 'text'
    ),
    space = list(
      x = M$x,
      y = M$y,
      z = M$z
    )
  ),
  tooltips = list(
    vis = list(
      x = 'text',
      y = 'text',
      z = 'text'
    ),
    space = list(
      x = M$x,
      y = M$y,
      z = M$z
    )
  )
),
auto_unbox = T)


setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'toy-2param.json')
