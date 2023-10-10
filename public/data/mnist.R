library(ggplot2)
library(reshape2)
library(tensorflow)
library(tfestimators)

# initialize data directory
data_dir <- "mnist-data"
dir.create(data_dir, recursive = TRUE, showWarnings = FALSE)

# download the MNIST data sets, and read them into R
sources <- list(

  train = list(
    x = "https://storage.googleapis.com/cvdf-datasets/mnist/train-images-idx3-ubyte.gz",
    y = "https://storage.googleapis.com/cvdf-datasets/mnist/train-labels-idx1-ubyte.gz"
  ),

  test = list(
    x = "https://storage.googleapis.com/cvdf-datasets/mnist/t10k-images-idx3-ubyte.gz",
    y = "https://storage.googleapis.com/cvdf-datasets/mnist/t10k-labels-idx1-ubyte.gz"
  )

)

# read an MNIST file (encoded in IDX format)
read_idx <- function(file) {

  # create binary connection to file
  conn <- gzfile(file, open = "rb")
  on.exit(close(conn), add = TRUE)

  # read the magic number as sequence of 4 bytes
  magic <- readBin(conn, what = "raw", n = 4, endian = "big")
  ndims <- as.integer(magic[[4]])

  # read the dimensions (32-bit integers)
  dims <- readBin(conn, what = "integer", n = ndims, endian = "big")

  # read the rest in as a raw vector
  data <- readBin(conn, what = "raw", n = prod(dims), endian = "big")

  # convert to an integer vecto
  converted <- as.integer(data)

  # return plain vector for 1-dim array
  if (length(dims) == 1)
    return(converted)

  # wrap 3D data into matrix
  matrix(converted, nrow = dims[1], ncol = prod(dims[-1]), byrow = TRUE)
}

mnist <- rapply(sources, classes = "character", how = "list", function(url) {

  # download + extract the file at the URL
  target <- file.path(data_dir, basename(url))
  if (!file.exists(target))
    download.file(url, target)

  # read the IDX file
  read_idx(target)

})

mnist$train$x

# convert training data intensities to 0-1 range
mnist$train$x <- mnist$train$x / 255
mnist$test$x <- mnist$test$x / 255

# try plotting the pixel intensities for a random sample of 32 images
n <- 80
set.seed(n)
indices <- sample(nrow(mnist$train$x), size = n)
data <- array(mnist$train$x[indices, ], dim = c(n, 28, 28))
melted <- melt(data, varnames = c("image", "x", "y"), value.name = "intensity")




space.img <- 1:n %>% purrr::map(function(i) {return(data[i,,])})
D.img <- outer(1:n, 1:n, Vectorize(function(i,j) {
  diff <- data[i,,]-data[j,,]
  return(1/(28*28) * sum(diff^2))
  # TODO sputnik and ssim?
}))

space.label <- mnist$train$y[indices]
D.label <- outer(space.label,space.label, Vectorize(function(i,j) {
  return(abs(i-j))
}))


space.img.flat <- space.img %>% purrr::map(function(x) {return(as.vector(x))}) %>% do.call(rbind, .)

space.mds <- cmdscale(D.img, k = 2)
D.mds <- dist(space.mds)

space.tsne <- tsne::tsne(D.img, k = 2, perplexity = 5)
D.tsne <- dist(space.tsne)


json <- jsonlite::toJSON(list(
  D = list(
    img = as.matrix(D.img),
    mds = as.matrix(D.mds),
    tsne = as.matrix(D.tsne),
    label = as.matrix(D.label)
  ),
  rownames = list(
    img = space.label,
    label=space.label,
    mds = space.label,
    tsne = space.label
  ),
  leafs = list(
    vis = list(
      img = 'image-inline',
      label = 'text',
      mds = 'embedding',
      tsne = 'embedding'
    ),
    space = list(
      img = space.img,
      label=space.label,
      mds = util_matrix_to_rows(space.mds),
      tsne = util_matrix_to_rows(space.tsne)
    )
  ),
  tooltips = list(
    vis = list(
      img = list('image-inline'),
      mds = list('embedding'),
      label = list('text'),
      tsne = list('embedding')
    ),
    space = list(
      img = space.img,
      label = space.label,
      mds = util_matrix_to_rows(space.mds),
      tsne = util_matrix_to_rows(space.tsne)
    )
  )
),
auto_unbox = T)

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'mnist.json')



