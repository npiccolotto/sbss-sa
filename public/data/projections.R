library('rnaturalearth')
library('ggmap')
library('spMaps')
library('raster')
library('maptools')

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
capitals <- read.csv('capitals.csv')

capitals <- capitals[sample(1:nrow(capitals), 30),]
data(wrld_simpl)

WGS84 <- sp::CRS('+proj=longlat +datum=WGS84 +no_defs')

world <- wrld_simpl


P.spatial <- sp::SpatialPoints(capitals[,c('Longitude','Latitude')], proj4string = WGS84)
rn <- capitals$Capital

EE <-
  sp::CRS('+proj=eqearth +lon_0=0 +datum=WGS84 +units=m +no_defs')
OAED <-
  sp::CRS('+proj=aeqd +lon_0=0 +lat_0=0 +datum=WGS84 +units=m +no_defs')
MOLL <-
  sp::CRS('+proj=moll +lon_0=0 +datum=WGS84 +units=m +no_defs')
WIN <-
  sp::CRS('+proj=wintri +lon_0=0 +datum=WGS84 +units=m +no_defs')
PAT <-
  sp::CRS('+proj=patterson +lon_0=0 +datum=WGS84 +units=m +no_defs')

space.ellipsoid <- P.spatial@coords
rownames(space.ellipsoid) <- rn
D.ellipsoid <- sp::spDists(P.spatial)

space.equal_earth <- spTransform(P.spatial, EE)@coords
D.equal_earth <- as.matrix(dist(space.equal_earth))

space.azimuthal <- spTransform(P.spatial, OAED)@coords
D.azimuthal <- as.matrix(dist(space.azimuthal))

space.mollweide <- spTransform(P.spatial, MOLL)@coords
rownames(space.mollweide) <- rn
D.mollweide <- as.matrix(dist(space.mollweide))

space.patterson <- spTransform(P.spatial, PAT)@coords
D.patterson <- as.matrix(dist(space.patterson))

space.winkel_tripel <- spTransform(P.spatial, WIN)@coords
D.winkel_tripel <- as.matrix(dist(space.winkel_tripel))

plot(hclust(dist(space.ellipsoid)))
plot(hclust(dist(space.mollweide)))

json <- jsonlite::toJSON(list(
  D = list(
    ellipsoid = as.matrix(D.ellipsoid),
    equal_earth = as.matrix(D.equal_earth),
    azimuthal = as.matrix(D.azimuthal),
    mollweide = as.matrix(D.mollweide),
    patterson = as.matrix(D.patterson),
    winkel_tripel = as.matrix(D.winkel_tripel)
  ),
  rownames = list(
    ellipsoid = rn,
    equal_earth = rn,
    azimuthal = rn,
    mollweide = rn,
    patterson = rn,
    winkel_tripel = rn
  ),
  leafs = list(
    vis = list(
      ellipsoid = 'embedding',
      equal_earth = 'embedding',
      azimuthal = 'embedding',
      mollweide = 'embedding',
      patterson = 'embedding',
      winkel_tripel = 'embedding'
    ),
    space = list(
      ellipsoid = util_matrix_to_rows(space.ellipsoid),
      equal_earth = util_matrix_to_rows(space.equal_earth),
      azimuthal = util_matrix_to_rows(space.azimuthal),
      mollweide = util_matrix_to_rows(space.mollweide),
      patterson = util_matrix_to_rows(space.patterson),
      winkel_tripel = util_matrix_to_rows(space.winkel_tripel)
    )
  ),
  tooltips = list(
    vis = list(
      ellipsoid = list('geospatial-point-3d'),
      equal_earth = list('image'),
      azimuthal = list('image'),
      mollweide = list('image'),
      patterson = list('image'),
      winkel_tripel = list('image')
    ),
    space = list(
      ellipsoid = util_matrix_to_rows(space.ellipsoid),
      equal_earth = util_matrix_to_rows(space.equal_earth),
      azimuthal = util_matrix_to_rows(space.azimuthal),
      mollweide = util_matrix_to_rows(space.mollweide),
      patterson = util_matrix_to_rows(space.patterson),
      winkel_tripel = util_matrix_to_rows(space.winkel_tripel)
    )
  )
),
auto_unbox = T)


setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'projections.json')

spacenames <-
  list('equal_earth',
       'azimuthal',
       'mollweide',
       'patterson',
       'winkel_tripel')
spaces <-
  list(
    equal_earth = space.equal_earth,
    azimuthal = space.azimuthal,
    mollweide = space.mollweide,
    patterson = space.patterson,
    winkel_tripel = space.winkel_tripel
  )
CRSs <- list(
  equal_earth = EE,
  azimuthal = OAED,
  mollweide = MOLL,
  patterson = PAT,
  winkel_tripel = WIN
)
setwd(
  '/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/images/projections'
)

for (spacename in spacenames) {
  dir.create(spacename)
  S <- spaces[[spacename]]
  
  for (r in 1:length(rn)) {
    rname <- rn[r]
    jpeg(paste(spacename, paste(rname, 'jpg', sep = '.'), sep = '/'),
         width = 500,
         height = 500)
    color <- rep('black', length(rn))
    color[r] <- 'red'
    pch <- rep(3, length(rn))
    pch[r] <- 16
    plot(sp::spTransform(world, CRSs[[spacename]]))
    plot(
      sp::spTransform(P.spatial, CRSs[[spacename]]),
      col = color,
      pch = pch,
      add = T
    )
    dev.off()
  }
}
