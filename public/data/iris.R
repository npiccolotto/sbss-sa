data(iris)

# try plotting the pixel intensities for a random sample of 32 images
n <- 80
set.seed(n)
indices <- sample(nrow(iris), size = n)
data <- iris[indices,1:4]
as.matrix(dist(rbind(data[1,],data[2,])))[1,2]

space.iris <- data
D.iris <- dist(data)

space.mds <- cmdscale(D.iris, k = 2)
D.mds <- dist(space.mds)

space.tsne <- tsne::tsne(D.iris, k = 2, perplexity = 5)
D.tsne <- dist(space.tsne)


json <- jsonlite::toJSON(list(
  D = list(
    iris = as.matrix(D.iris),
    mds = as.matrix(D.mds),
    tsne = as.matrix(D.tsne)
  ),
  rownames = list(
    iris = iris[indices,4],
    mds = iris[indices,4],
    tsne = iris[indices,4]
  ),
  leafs = list(
    vis = list(
      iris = 'multivariate',
      mds = 'embedding',
      tsne = 'embedding'
    ),
    space = list(
      iris = space.iris,
      mds = util_matrix_to_rows(space.mds),
      tsne = util_matrix_to_rows(space.tsne)
    )
  ),
  tooltips = list(
    vis = list(
      iris = list('multivariate'),
      mds = list('embedding'),
      tsne = list('embedding')
    ),
    space = list(
      iris = space.iris,
      mds = util_matrix_to_rows(space.mds),
      tsne = util_matrix_to_rows(space.tsne)
    )
  )
),
auto_unbox = T)

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'iris.json')



