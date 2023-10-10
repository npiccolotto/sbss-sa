library('sp')

cities <- c("Berlin", "Helsinki", "Stockholm", "London", "Glasgow")

space.cities <- matrix(ncol=2, byrow=T, data=c(
  13.2846506,52.5067614,
  24.9417,60.1948,
  17.8419723,59.3260668,
  -0.2285257,51.4854189,
  -4.3024977,55.8554403
))

rownames(space.cities) <- cities
space.cities

WGS84 <- sp::CRS('+proj=longlat +datum=WGS84 +no_defs')
P.spatial <- sp::SpatialPoints(space.cities, proj4string = WGS84)

dist.km_air <- sp::spDists(P.spatial)
rownames(dist.km_air) <- cities
dist.km_air
plot(hclust(as.dist(dist.km_air)),hang=-0.1, main='Air travel distance')

dist.km_ground <- matrix(ncol=length(cities), byrow=T, data=c(
  0, 2123, 1404, 1101, 1734,
  2123, 0, 1761, 3196, 3829,
  1404, 1761, 0, 2035, 2668,
  1101, 3196, 2035, 0, 641,
  1734, 3829, 2668, 641, 0
))
rownames(dist.km_ground) <- cities
plot(hclust(as.dist(dist.km_ground)),hang=1, main='Ground travel distance')

json <- jsonlite::toJSON(list(
  D = list(
    air = dist.km_air,
    ground=dist.km_ground
  ),
  rownames = list(
    air = cities,
    ground=dist.km_ground
  ),
  leafs = list(
    vis = list(
      air = 'embedding',
      ground = 'embedding'
    ),
    space = list(
      air = P.spatial@coords,
      ground = P.spatial@coords
    )
  ),
  tooltips = list(
    vis = list(
      air = list('geospatial-point-3d'),
      ground = list('geospatial-point-3d')
    ),
    space = list(
      air = P.spatial@coords,
      ground = P.spatial@coords
    )
  )
),
auto_unbox = T)


setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'toy.json')

