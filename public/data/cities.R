library('sp')

cities <- c('Vienna','Berlin', 'Paris','London', 'Helsinki', 'Madrid','Rome','Warsaw','Athens','Belgrade')

space.cities <- matrix(nrow=10, ncol=2, byrow=T,data=c(
  16.3779,48.2119,
  13.4088,52.5229,
  2.3566,48.8611,
  -0.1037,51.5152,
  24.9417,60.1948,
  -3.7024,40.4302,
  12.4887,41.8982,
  20.9894,52.2312,
  23.7305,37.9918,
  20.4565,44.8150
))
rownames(space.cities) <- cities
space.cities

WGS84 <- sp::CRS('+proj=longlat +datum=WGS84 +no_defs')
AZIM_ED <- sp::CRS('+proj=aeqd +lon_0=13.1835938 +lat_0=53.8613122 +datum=WGS84 +units=m +no_defs')
P.spatial <- sp::SpatialPoints(space.cities, proj4string = WGS84)
P.flat <- sp::spTransform(P.spatial, AZIM_ED)


dist.plane <- matrix(nrow=10, ncol=10, byrow=T,data=c(
  0,75,115,120,140,170,95,80,125,70,
  75,0,100,100,120,180,125,90,175,110,
  115,100,0,65,175,120,115,125,180,135,
  120,100,65,0,170,140,140,120,210,160,
  140,120,175,170,0,265,205,100,215,315,
  170,180,120,140,265,0,135,210,195,305,
  95,125,115,140,205,135,0,130,110,95,
  80,90,125,120,100,210,130,0,155,100,
  125,175,180,210,215,195,110,155,0,95,
  70,110,135,160,315,305,95,100,95,0
))
dist.plane.dist <- as.matrix(sp::spDists(P.spatial))
colnames(dist.plane) <- cities
rownames(dist.plane) <- cities
dist.plane


INF <- 1e4
dist.train <- matrix(nrow=10, ncol=10, byrow=T, data=c(
  0,460,600,1150,INF,1740,679,445,1860,2100,
  460,0,497,973,INF,1389,1007,353,2160,1620,
  600,497,0,137,INF,726,691,1071,2340,2280,
  1150,973,137,0,INF,1044,1108,1137,3060,2640,
  INF,INF,INF,INF,0,INF,INF,INF,INF,INF,
  1740,1389,726,1044,INF,0,1620,2100,3660,3000,
  679,1007,691,1108,INF,1620,0,1440,2340,915,
  445,353,1071,1137,INF,2100,1440,0,2280,2100,
  1860,2160,2340,3060,INF,3660,2340,2280,0,INF,
  2100,1620,2280,2640,INF,3000,915,2100,INF,0
))
colnames(dist.train) <- cities
rownames(dist.train) <- cities
dist.train

dist.car <- matrix(nrow=10, ncol=10, byrow=T, data=c(
  0,498,750,947,1355,1401,692,476,1062,478,
  498,0,655,730,1249,1367,935,380,1440,794,
  750,655,0,361,1860,746,856,946,1680,1051,
  947,730,361,0,1920,1046,1172,1033,1920,1268,
  1355,1249,1860,1920,0,2520,2040,934,2280,1680,
  1401,1367,746,1046,2520,0,1159,1740,2160,1500,
  692,935,856,1172,2040,1159,0,1115,1175,789,
  476,380,946,1033,934,1740,1115,0,1412,745,
  1062,1440,1680,1920,2280,2160,1175,1412,0,651,
  478,794,1051,1268,1680,1500,789,745,651,0
))
colnames(dist.car) <- cities
rownames(dist.car) <- cities
dist.car

dist.car.dist <- matrix(nrow=10, ncol=10, byrow=T, data=c(
  0,657,1239,1472,1751,2374,1119,671,1705,613,
  657,0,1057,1100,1647,2322,1501,574,2334,1242,
  1239,1057,0,465,2664,1275,1422,1591,2874,1854,
  1472,1100,465,0,2707,1723,1846,1634,3185,2093,
  1751,1647,2664,2707,0,3930,2860,1081,3398,2192,
  2374,2322,1275,1723,3930,0,1959,2858,3248,2588,
  1119,1501,1422,1846,2860,1959,0,1785,1299,1278,
  671,574,1591,1634,1081,2858,1785,0,2320,1074,
  1705,2334,2874,3185,3398,3248,1299,2320,0,1093,
  613,1242,1854,2093,2192,2588,1278,1074,1093,0
))
colnames(dist.car.dist) <- cities
rownames(dist.car.dist) <- cities
dist.car.dist


P.flat@coords

json <- jsonlite::toJSON(list(
  D = list(
    car = dist.car.dist,
    plane = dist.plane.dist
  ),
  rownames = list(
    car = cities,
    plane = cities
  ),
  leafs = list(
    vis = list(
      car = 'embedding',
      plane = 'embedding'
    ),
    space = list(
      car = P.flat@coords,
      plane = P.flat@coords
    )
  ),
  tooltips = list(
    vis = list(
      plane = list('geospatial-point-3d'),
      car = list('geospatial-point-3d')
    ),
    space = list(
      car = P.spatial@coords,
      plane = P.spatial@coords
    )
  )
),
auto_unbox = T)

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'cities.json')


plot(hclust(as.dist(dist.car.dist)))

