library('dplyr')
library("ape")
library('moments')
library('phylin')
library('isoband')
library("SpatialBSS")
library('ggplot2')
library("compositions")
library('dplyr')
library('sp')
library('rnaturalearth')
library('robCompositions')
library('ggmap')
library('spMaps')
library('raster')
library('lpSolve')


setwd('/Users/npiccolotto/Projects/cvast/bssvis/sbss-app/server/app/data/')
moss.csv <- read.csv('kola.csv')
gemas.csv <- read.csv('gemas.csv')
co.csv <- read.csv('colorado.csv')
data.csv <- co.csv

WGS84 <- sp::CRS('+proj=longlat +datum=WGS84 +no_defs')
UTM <- sp::CRS('+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs')
WEBMERC <- sp::CRS('+proj=webmerc +datum=WGS84')
CRS_FLAT <- WEBMERC

xy <- 1:2
elements <- 3:ncol(data.csv)
P.spatial <-
  sp::SpatialPoints(as.matrix(data.csv[, xy]), proj4string = WGS84)
coords.flat <- spTransform(P.spatial, CRS_FLAT)

moss <- as.matrix(data.csv[, elements])
moss.clr <- compositions::clr(moss)
moss.clr.spatial <-
  SpatialPointsDataFrame(coords = P.spatial@coords, data = as.data.frame(moss.clr), proj4string = WGS84)
ilrBase <- compositions::ilrBase(moss)
moss.ilr <- log(as.matrix(moss)) %*% ilrBase
moss.ilr.spatial <-
  SpatialPointsDataFrame(coords = P.spatial@coords, data = as.data.frame(moss.ilr), proj4string = WGS84)

P <- coords.flat@coords
diameter <- max(dist(P))
colnames(P) <- c('x', 'y')

# joni's rings plus 0-100km which sbssvis' variograms suggest
KERNELS <- list(
  c(0, 100000),
  c(0, 42858.9),
  c(0, 85717.81),
  c(42858.9, 85717.81),
  c(42858.9, 128576.7),
  c(85717.81, 128576.7),
  c(85717.81, 171435.6)
)

util_get_coords <- function(P) {
  return(P@polygons[[1]]@Polygons[[1]]@coords)
}

spatial.voronoi <- SDraw::voronoi.polygons(P.spatial, range.expand = 0.025)

util_mask_to_region <- function(mask) {
  n_levels <- length(levels(mask))
  x <- 1:n_levels
  names(x) <- levels(mask)
  unmasked <- x[mask] %>% unname()
  regionalization <- list()
  for (i in 1:n_levels) {
    selection <- 1:length(mask) %in% which(unmasked %in% c(i))
    region <- raster::aggregate(spatial.voronoi[selection, ])
    regionalization[[i]] <- list(
      selection=selection,
      region=region,
      patch=util_get_coords(region),
      patch_flat=util_get_coords(spTransform(region, CRS_FLAT))
    )
  }
  return(regionalization)
}

# Regionalization 2: West to east
reg_1 <- util_mask_to_region(cut(P.spatial@coords[, 1], breaks = 10))

# Regionalization 2: South to north
reg_2 <- util_mask_to_region(cut(P.spatial@coords[, 2], breaks = 10))

# Regionalization 3: Rings around Denver
#reg_3 <- util_mask_to_region(cut(apply(P.spatial@coords, 1, function(w) sqrt(sum((w - c(-104.99, 39.74))^2))), breaks = 10))
# remove because my code can't deal with regions that are two separate areas

# Regionalization 4: Diagonally 1
reg_4 <- util_mask_to_region(cut(P.spatial@coords[, 1] + P.spatial@coords[, 2], breaks = 10))

# Regionalization 5: Diagonally 2
reg_5 <- util_mask_to_region(cut(P.spatial@coords[, 1] - P.spatial@coords[, 2], breaks = 10))

# NP: Regionalization 6: 1 region
x <- rep(1, nrow(P.spatial@coords))
names(x) <- rep("foo", nrow(P.spatial@coords))
levels(x) <- c("foo")
reg_6 <- util_mask_to_region(x)

REGIONS <- list(
  reg_1,
  reg_2,
  #reg_3,
  reg_4,
  reg_5,
  reg_6
)

params <- expand.grid(1:length(REGIONS), 1:length(KERNELS))
results <- list()
for (i in 1:nrow(params)) {
  print(i)
  k <- KERNELS[[params[i,2]]]
  print(k)
  
  r <- REGIONS[[params[i,1]]]
  
  x <- r %>% purrr::map(function(x) {
    v <- x$selection
    r <- moss.ilr[c(v),]
    if (is.null(dim(r))) {
      r <- matrix(data=r, nrow=length(v))
      return(r)
    }
    return(r)
  })
  coords <- r %>% purrr::map(function(x) {
    v <- x$selection
    r <- P[v,]
    if (is.null(dim(r))) {
      r <- matrix(data=r, nrow=length(v))
      return(r)
    }
    return(r)
  })
  
  result <- tryCatch(
    SpatialBSS.snss::nssbss_si_jd(
      x = x,
      coords = coords,
      kernel_type = 'ring',
      kernel_parameters = k,
      maxiter = 1e7
    ),
    error =  function(e) {
      print(e)
      return(NA)
    },
    warning = function(w) {
      print(w)
      return(NA)
    }
  )
  
  results <- append(results, list(result))
}

space.w <- results  %>% purrr::map(function(r) {return(r$w)})
D.w <-
  outer(1:length(results), 1:length(results), Vectorize(function(i, j) {
    x <- results[[i]]$w
    y <- results[[j]]$w
    return(JADE::MD(x, solve(y)))
  }))

util_prepare_for_lp <- function(D) {
  # D is not square and lp doesn't like non-square matrices
  # hence we fill the remaining rows/cols with a large constant
  numrows <- nrow(D)
  numcols <- ncol(D)
  if (numrows == numcols) {
    return(D)
  }
  retranspose <- F
  if (numcols < numrows) {
    D <- t(D)
    numrows <- nrow(D)
    numcols <- ncol(D)
    retranspose <- T
  }
  while (numrows < numcols) {
    D <- rbind(D, rep(1e10, numcols))
    
    numrows <- nrow(D)
    numcols <- ncol(D)
  }
  if(retranspose) {
    return(t(D))
  }
  return(D)
}

util_bipartite_match <- function(DT, sizeA, sizeB) {
  DT.lp <- util_prepare_for_lp(DT)
  x <- lp.assign(DT.lp)
  assignment <- x$solution[1:sizeA,1:sizeB]
  return(sum(DT * assignment))
}


util_get_grid <- function(P, num_cells_x, num_cells_y) {
  bbox <- c(
    min(P[,1]),
    min(P[,2]),
    max(P[,1]),
    max(P[,2])
  )
  w <- bbox[3] - bbox[1]
  h <- bbox[4] - bbox[2]
  c_w <- w/num_cells_x
  c_h <- h/num_cells_y
  xs <- bbox[1] + c_w/2 + seq(0,num_cells_x-1) * c_w
  ys <- bbox[2] + c_h/2 + seq(0,num_cells_y-1) * c_h
  return(list(
    grid=expand.grid(xs,ys),
    xs=xs,
    ys=ys
  ))
}

util_split_sf_multiline <- function(multiline) {
  M <- sf::st_coordinates(multiline)
  if (length(M) == 0) {
    return(matrix(0, ncol=2, nrow=0))
  }
  lineids <- M[,3]
  numlines <- max(unique(lineids))
  lines <- list()
  for (i in 1:numlines) {
    lines <- append(lines, list(M[lineids == i,1:2]))
  }
  return(lines)
}

util_predict_to_grid <- function(S, P.spatial, x, y, p=2) {
  coords <- P.spatial@coords[fixed_order,]
  grid <- util_get_grid(coords, x, y)
  grid_data <- phylin::idw(S[fixed_order], coords, grid$grid, p)
  
  grid_matrix <- matrix(0, x, y)
  for (i in 1:x) {
    for (j in 1:y) {
      z <- (i-1)*x + j
      grid_matrix[i, j] <-
        grid_data$Z[z]
    }
  }
  return(list(
    grid=grid,
    data=grid_matrix,
    vector=grid_data
  ))
}

util_get_isolines <- function(S, P.spatial, x, y, quants) {
  grid <- util_predict_to_grid(S, P.spatial, x, y)
  
  isosfg <- isoband::iso_to_sfg(isoband::isolines(grid$grid$xs, grid$grid$ys, grid$data, quantile(S, quants)))
  result <- list()
  for (i in 1:length(quants)) {
    result <- append(result, list(util_split_sf_multiline(isosfg[[i]])))
  }
  return(result)
}

kurtosis <- function(x) {return(moments::moment(x, order=4))}
moransi <- function(x, W) {
  return(ape::Moran.I(x, W)$observed)
}
skewness <- function(x) {return(abs(moments::moment(x, order=3)))}


util_sbss_to_isolines <- function(R, P.spatial, x=32, y=32) {
  isolines <- list()
  #D <- 1/as.matrix(sp::spDists(P.spatial))
  #diag(D) <- 0
  #isoline_order <- order(apply(R, 2, function(x) {return(kurtosis(x))}), decreasing=T)
  for (i in 1:ncol(R)) {
    isolines <- append(isolines, list(util_get_isolines(R[,i], P.spatial, x,y, seq(0.1, 0.9, 0.1))))
  }
  return(isolines)
}

util_interval_rel_overlap <- function(x1, x2, y1, y2) {
  # enforce assumptions x1<=x2 and y1<=y2
  if (x1 > x2) {
    a <- x1
    x1 <- x2
    x2 <- a
  }
  if (y1 > y2) {
    a <- y1
    y1 <- y2
    y2 <- a
  }
  
  if (x2 < y1 || x1 > y2) {
    # no overlap
    return(0)
  }
  if (((x1 >= y1) && (x2 <= y2)) ||
      ((y1 >= x1) && (y2 <= x2))) {
    # containment
    lx <- x2 - x1
    ly <- y2 - y1
    return(min(lx, ly) / max(lx, ly))
  }
  left <- max(x1, y1)
  right <- min(x2, y2)
  return((right - left) / (max(y2, x2) - min(x1, y1)))
}

util_intervals_vector_to_list <- function(v) {
  num_intervals <- length(v) / 2
  l <- list()
  for (i in 1:num_intervals) {
    idx1 <- i * 2 - 1
    idx2 <- idx1 + 1
    l <- append(l, list(c(v[idx1], v[idx2])))
  }
  return(l)
}

generalized_tversky <-
  function(DT,
           a = 0,
           alpha = 1,
           beta = 1,
           a.relative = F,
           DT.dist = F,
           An,
           Bn) {
    if (DT.dist) {
      DT <- DT[(An + 1):nrow(DT), 1:(ncol(DT) - Bn)]
    }
    
    AB <- 0
    A_B <- 0
    B_A <- 0
    
    if (a.relative) {
      D.max <- max(DT)
      AB <- sum(as.numeric(DT <= a * D.max), na.rm = T)
      A_B <- sum(apply(DT, 1, function(row) {
        return(as.numeric(all(row > a * D.max, na.rm = T)))
      }))
      B_A <- sum(apply(DT, 2, function(col) {
        return(as.numeric(all(col > a * D.max, na.rm = T)))
      }))
    } else {
      AB <- sum(as.numeric(DT <= a), na.rm = T)
      A_B <- sum(apply(DT, 1, function(row) {
        return(as.numeric(all(row > a, na.rm = T)))
      }))
      B_A <- sum(apply(DT, 2, function(col) {
        return(as.numeric(all(col > a, na.rm = T)))
      }))
    }
    return(AB / (AB + alpha * A_B + beta * B_A))
  }

D.k <-
  outer(params[,2], params[,2], Vectorize(function(i, j) {
    v1 <- KERNELS[[i]]
    v2 <- KERNELS[[j]]
    return(1-util_interval_rel_overlap(v1[1],v1[2], v2[1], v2[2]))
  }))
space.k <- params[,2] %>% purrr::map(function(x) {return(KERNELS[[x]])})
space.k.geojson <-
  space.k %>% purrr::map(function(v) {
    center <-
      apply(P, 2, min) + (apply(P, 2, max) - apply(P, 2, min)) / 2
    # TODO need to make a circle polygon
    # https://stackoverflow.com/a/14829908/490524
    xy <-
      function(j, k, r, t) {
        return(c(r * cos(t) + j, r * sin(t) + k))
      }
    circle <- function(center, r, p=24) {
      return(c(1:p, 1) %>% purrr::map(function(t) {
        return(xy(center[1], center[2], r, t / p * 2 * pi))
      }) %>% do.call(rbind , .))
    }
    circleInner <- circle(center, v[1])
    circleOuter <- circle(center, v[2])
    
    donut <-  sp::SpatialPolygons(list(sp::Polygons(list(
      sp::Polygon(circleOuter, hole = F),
      sp::Polygon(circleInner, hole = T)
    ), ID = 'donut')), proj4string = CRS_FLAT)
    
    return(
      util_geojson_fc(
        list(
          util_polygon_to_geojson(spTransform(donut, WGS84)))
      )
    )
  })

util_set_overlap <- function(s1, s2) {
  A <- length(s1)
  B <- length(s2)
  
  # intersection
  AB <- length(which(s1 %in% s2 == T))
  
  # differences
  A_o_B <- A - AB
  B_o_A <- B - AB
  
  # union = differences + intersection
  A_u_B <- AB + A_o_B + B_o_A
  
  # jaccard index is intersection / union
  return(AB / A_u_B)
}

space.r <- params[,1] %>% purrr::map(function(i) {
  return(REGIONS[[i]] %>% purrr::map(function(r) {return(r$patch_flat)}))
})


util_regionalization_to_int_vector <- function(region) {
  int_vector <- rep(0, length(region[[1]]$selection))
  j <- 1
  for (r in region) {
    int_vector[r$selection] <- j
    j <- j + 1
  }
  return(int_vector)
}

points_in_same_region <- params[,1] %>% purrr::map(function(i) {
  vr <- util_regionalization_to_int_vector(REGIONS[[i]])
  return(outer(1:length(vr), 1:length(vr), Vectorize(function(k,l) {
    return(vr[k] == vr[l])
  })))
})

# regionalization dissimilarity: % of point pairs that are assigned to the same region
D.r <- outer(params[, 1], params[, 1], Vectorize(function(i, j) {
  match <- points_in_same_region[i] && points_in_same_region[j]
  tri <- match[lower.tri(match, diag = T)]
  return(length(tri[tri == T]) / length(tri))
}))

# D.r <-
#   outer(params[,1],
#         params[,1],
#         Vectorize(function(i, j) {
#           r1 <- REGIONS[[i]]
#           r2 <- REGIONS[[j]]
#           
#           P.S1 <- r1 %>% purrr::map(function(r) {
#             idxs <- which(r$selection %in% c(T))
#             return(idxs)
#           })
#           P.S2 <- r2 %>% purrr::map(function(r) {
#             idxs <- which(r$selection %in% c(T))
#             return(idxs)
#           })
#           
#           DT <-
#             outer(1:length(P.S1), 1:length(P.S2), Vectorize(function(k, l) {
#               return(1-util_set_overlap(P.S1[[k]], P.S2[[l]]))
#             }))
#           return(util_bipartite_match(DT, length(P.S1), length(P.S2)) / min(length(P.S1), length(P.S2)))
#         }))

util_make_polygon <-
  function(M, ID = 'foo', proj4string = UTM) {
    p <-
      sp::SpatialPolygons(list(sp::Polygons(list(
        sp::Polygon(M, hole = F)
      ), ID = ID)), proj4string = proj4string)
    return(p)
  }
util_get_coords <- function(P) {
  return(P@polygons[[1]]@Polygons[[1]]@coords)
}
util_polygon_to_geojson <- function(poly) {
  has_hole <- poly@polygons[[1]]@Polygons %>% purrr::some(function(x) {return(x@hole)})
  if (!has_hole) {
    return(list(
      type = 'Feature',
      properties = list(),
      geometry = list(type = 'Polygon',
                      coordinates = list(util_get_coords(poly)))
    ))
  }
  # assuming holes are last
  return(list(
    type = 'Feature',
    properties = list(),
    geometry = list(type = 'Polygon',
                    coordinates = poly@polygons[[1]]@Polygons %>% purrr::map(function(x) {return(x@coords)})
    )))
}


util_geojson_fc  <- function(features) {
  return(list(type = 'FeatureCollection',
              features = features))
}

space.r.geojson <- params[,1] %>% purrr::map(function(i) {
  polys <- REGIONS[[i]] %>% purrr::map(function(M) {
    poly <- util_make_polygon(M$patch)
    return(poly)
  })
  fc <-
    util_geojson_fc(polys %>% purrr::map(function(p) {
      return(util_polygon_to_geojson(p))
    }))
  return(fc)
})


#space.s.iso <- results %>% purrr::map(function(r) {
#  return(util_sbss_to_isolines(r$s, spTransform(P.spatial, CRS_FLAT), 16, 16)) # 16x16 compromise between final json size and fidelity
#})


bbox <- sp::bbox(P.spatial)
gmap <- ggmap::get_map(location=bbox, source='osm', zoom = 7, color = 'bw', force = TRUE)
map_px_attributes <- attributes(gmap)
gmap_trans <- matrix(adjustcolor(gmap,alpha.f = 0.4),nrow = nrow(gmap))
attributes(gmap_trans) <- map_px_attributes
ntiles <- 5
bbox_flat <- sp::bbox(P)
bbox_ar <- bbox_flat[,2]-bbox_flat[,1]
bbox_ar <- bbox_ar[1]/bbox_ar[2]


p <- ncol(results[[1]]$s)
setwd(
  '/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/images/snss_co/w/'
)
for (r in 1:length(results)) {
  for (e in 1:p) {
    jpeg(paste(paste(r, e, sep = '-'), 'jpg', sep = '.'),
         width = 1500,
         height = 1500/bbox_ar)
    coords <-
      spTransform(sp::SpatialPoints(results[[r]]$coords, CRS_FLAT), WGS84)@coords
    x <-
      sp::SpatialPointsDataFrame(coords = coords, data = as.data.frame(results[[r]]$s[, e]))
    #g <- util_predict_to_grid(xxxx, P.spatial, 32,32, 0.25)
    #g <- sp::SpatialPointsDataFrame(coords=g$grid$grid, data = g$vector)
    d <-
      as.data.frame(cbind(
        x@coords,
        x@data,
        x@data < 0,
        dplyr::ntile(x@data, ntiles),
        abs(ceiling(ntiles / 2) - dplyr::ntile(x@data, ntiles)) + 1
      ))
    colnames(d) <-
      c('longitude',
        'latitude',
        'c',
        'is_neg',
        'ntile',
        'norm_ntile')
    
    plot(ggmap::ggmap(gmap_trans) +
           geom_point(
             data = d,
             stroke = 0,
             shape = 21,
             aes(
               x = longitude,
               y = latitude,
               fill = factor(ntile),
               size = factor(ntile),
             )
           ) +
           ggplot2::scale_size_manual(values = 4.5 * c(1, 0.8, 0.3, 0.8, 1)) +
           ggplot2::theme(
             legend.position = 'none',
             axis.ticks = element_blank(),
             axis.text = element_blank(),
             axis.title = element_blank()
           ) +
           #ggplot2::scale_shape_manual(values = c(22, 22, 16, 21, 21)) +
           ggplot2::scale_fill_manual(values = c('#2166ac', '#4393c3', '#666666', '#d6604d', '#b2182b')))
    
    dev.off()
  }
}

space.image <- as.vector(t(outer(1:length(results), 1:p, Vectorize(function(x,y) {return(paste(x,y,sep='-'))})))) %>% purrr::map(function(x) {return(paste(x,'jpeg',sep='.'))}) %>% unlist()


p <- ncol(results[[1]]$s)
n <- length(results)
# for gemas that's 132^2 x 17^2 iterations so like 5M (:
D.s <- outer(1:n, 1:n, Vectorize(function(k,l) {
  return(util_bipartite_match(outer(1:p, 1:p, Vectorize(function(i,j) {
    coordsk <-
      spTransform(sp::SpatialPoints(results[[k]]$coords, CRS_FLAT), WGS84)@coords
    fixed_order <- as.data.frame(coordsk) %>% tibble::rownames_to_column()
    fixed_order <- as.numeric(fixed_order[order(fixed_order$x, fixed_order$y),1])
    return(1-abs(cor(results[[k]]$s[fixed_order,i], results[[l]]$s[fixed_order,j])))
  })), p, p))
}))

space.s <- results %>% purrr::map(function(r) {
  coords <-
    spTransform(sp::SpatialPoints(r$coords, CRS_FLAT), WGS84)
  D.points <- 1/as.matrix(sp::spDists(coords))^2
  diag(D.points) <- 0
  
  fixed_order <- as.data.frame(r$coords) %>% tibble::rownames_to_column()
  fixed_order <- as.numeric(fixed_order[order(fixed_order$x, fixed_order$y),1])
  kurts <- apply(r$s[,], 2, function(x){return(moransi(x, D.points))})
  return(kurts)
})



json <- jsonlite::toJSON(list(
  D = list(
    w = as.matrix(D.w),
    k = as.matrix(D.k),
    r = as.matrix(D.r)
  ),
  rownames=list(
    k = params[,2] %>% purrr::map(function(k) {return(paste(paste(round(KERNELS[[k]]/1000, digits=2), collapse = '-'), 'km'))}),
    r = list()
  ),
  leafs = list(
    space = list(w = space.s,
                 k = space.k,
                 r = space.r),
    vis = list(w = 'tilemap',
               k = 'balls',
               r = 'multipolygons')
  ),
  tooltips = list(
    ctx=list(
      points=P.spatial@coords,
      points_flat=P
    ),
    space = list(w = space.image,
                 k = space.k.geojson,
                 r = space.r.geojson),
    vis = list(w = list('image'),
               k = list('geojson'),
               r = list('geojson'))
  )
),
auto_unbox = T)

setwd('/Users/npiccolotto/Projects/cvast/bssvis/meta-similarities/public/data/')
write(x = json, file = 'snss_co.json')



