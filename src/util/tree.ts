export interface TreeNode {
  // Note that a node might have isLeaf = false but no children when it was folded
  isLeaf: boolean;
  children: [TreeNode, TreeNode] | [];
  index: number;
  id: string;
  hiddenLeafs: number;
  parent: TreeNode;
  foldedSubtree: [TreeNode, TreeNode] | [];
  displayChild: TreeNode;

  x: number;
  y: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;

  s1: { value: number };
  s2: { value: number };
  diff: number;
}
export function traverseUpwards(node: TreeNode, cb: (n: TreeNode) => void) {
  if (node === undefined) {
    return;
  }
  cb(node);
  traverseUpwards(node.parent, cb);
}
export function isInSubTreeOf(node: TreeNode, parent: TreeNode) {
  let answer = false;
  traverseUpwards(node, (n) => {
    if (n.id === parent.id) {
      answer = true;
    }
  });
  return answer;
}
export function traversePostOrder(
  node: TreeNode,
  cb: (n: TreeNode) => void,
  ignoreFolding = false
) {
  let subtree = node.children;
  if (subtree.length === 0 && ignoreFolding) {
    subtree = node.foldedSubtree;
  }
  for (const child of subtree) {
    traversePostOrder(child, cb, ignoreFolding);
  }
  cb(node);
}
export function traversePreOrder(
  node: TreeNode,
  cb: (n: TreeNode) => void,
  breakCondition: (n: TreeNode) => boolean = () => false
) {
  cb(node);
  if (breakCondition(node)) {
    return;
  }
  for (const child of node.children) {
    traversePreOrder(child, cb);
  }
}
export function flattenTree(node: TreeNode) {
  const flat: TreeNode[] = [];
  traversePostOrder(node, (n) => flat.push(n));
  return flat;
}
export function subTreeContains(
  node: TreeNode,
  testFn: (node: TreeNode) => boolean
) {
  let contains = false;
  traversePreOrder(
    node,
    (n) => {
      if (testFn(n)) {
        contains = true;
      }
    },
    testFn
  );
  return contains;
}
export function parents(node: TreeNode, list: TreeNode[] = []) {
  if (node.parent !== undefined) {
    list.push(node.parent);
    parents(node.parent, list);
  }
  return list;
}
export function leafs(
  node: TreeNode,
  countFolded = false,
  ignoreFolding = false
) {
  const l: TreeNode[] = [];
  traversePostOrder(
    node,
    (n) => {
      const condition = countFolded ? n.children.length === 0 : n.isLeaf;
      if (condition) {
        l.push(n);
      }
    },
    ignoreFolding
  );
  return l;
}
export function pathToLeaf(
  node: TreeNode,
  leaf: number,
  path: TreeNode[]
): TreeNode[] {
  for (const child of node.children) {
    if (subTreeContains(child, (n) => n.index === leaf)) {
      return pathToLeaf(child, leaf, [...path, child]);
    }
  }
  return path;
}
export function leafPathDist(root: TreeNode, a: number, b: number) {
  const r2a = pathToLeaf(root, a, []);
  const r2b = pathToLeaf(root, b, []);

  let i = 0;
  while (i < r2a.length && i < r2b.length) {
    i++;
    if (r2a[i] !== r2b[i]) {
      break;
    }
  }
  const lcaIndexFromRoot = i - 1;
  return r2a.length + r2b.length - 2 * lcaIndexFromRoot;
}
