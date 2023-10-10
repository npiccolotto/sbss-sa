library('tsne')
library('umap')
library('jsonlite')
library('dplyr')
library('ggplot2')
data(mtcars)

rn <- rownames(mtcars)
cn <- colnames(mtcars)

normalize <- function(x) {
  return((x - min(x)) / (max(x) - min(x)))
}
space.original <- mtcars
#space.original <- apply(space.original.o, 2, normalize)
D.original <- dist(space.original)

space.mds <- cmdscale(D.original, k = 2)
D.mds <- dist(space.mds)

space.tsne <- tsne::tsne(D.original, k = 2, perplexity = 5)
D.tsne <- dist(space.tsne)

space.umap <- umap::umap(space.original)$layout
D.umap <- dist(space.umap)

pca <- princomp(space.original)
space.pca <- pca$scores[, 1:2]
D.pca <- dist(space.pca)

util_matrix_to_rows <- function(M) {
  return(unname(as.list(as.data.frame(t(
    M
  )))))
}


setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/images/mtcars-DR/original/')
for (r in rn) {
  jpeg(paste(r, 'jpg', sep = '.'),
       width = 500,
       height = 500)
  barplot(as.matrix(N[r, ]))
  dev.off()
}

space.image <- rn %>% purrr::map(function(n) {return(list(paste(n,'jpg',sep='.')))}) 

json <- jsonlite::toJSON(list(
  D = list(
    original = as.matrix(D.original),
    mds = as.matrix(D.mds),
    umap = as.matrix(D.umap),
    tsne = as.matrix(D.tsne),
    pca = as.matrix(D.pca)
  ),
  rownames = list(
    original = rn,
    mds = rn,
    umap = rn,
    tsne = rn,
    pca = rn
  ),
  leafs = list(
    vis = list(
      original = 'image',
      mds = 'embedding',
      umap = 'embedding',
      tsne = 'embedding',
      pca = 'embedding'
    ),
    space = list(
      original = space.image,
      mds = util_matrix_to_rows(space.mds),
      umap = util_matrix_to_rows(space.umap),
      tsne = util_matrix_to_rows(space.tsne),
      pca = util_matrix_to_rows(space.pca)
    )
  ),
  tooltips = list(
    vis = list(
      original = list('image'),
      mds = list('embedding'),
      umap = list('embedding'),
      tsne = list('embedding'),
      pca = list('embedding')
    ),
    space = list(
      original = space.original,
      mds = util_matrix_to_rows(space.mds),
      umap = util_matrix_to_rows(space.umap),
      tsne = util_matrix_to_rows(space.tsne),
      pca = util_matrix_to_rows(space.pca)
    )
  )
),
auto_unbox = T)

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'mtcars-DR.json')


