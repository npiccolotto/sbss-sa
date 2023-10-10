import * as druid from "@saehrimnir/druidjs";
import { Matrix } from "ml-matrix";
import { sortPerm } from "@/util/util";

export function seriate(D: Matrix) {
  const M = druid.Matrix.from(D.to2DArray());
  const proj = new druid.MDS(M, 1, "precomputed");
  const axis = proj.transform().col(0);
  const order = sortPerm(axis);
  return order;
}
