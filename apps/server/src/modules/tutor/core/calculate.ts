/**
 * Tom's calculator: the model computes nothing in its head. mathjs reads the expression, which
 * must be arithmetic only, then computes it: no function but the square root, no symbol, no
 * assignment, as the mathjs security guidance advises for an expression from outside
 * (https://mathjs.org/docs/expressions/security.html).
 */

import { format, isConstantNode, isFunctionNode, isOperatorNode, isParenthesisNode, parse, type MathNode } from 'mathjs';

const OPERATORS = new Set(['add', 'subtract', 'multiply', 'divide', 'pow', 'mod', 'unaryMinus', 'unaryPlus']);

const arithmetic = (node: MathNode, path: string): boolean =>
  (isConstantNode(node) && typeof node.value === 'number') ||
  (isOperatorNode(node) && OPERATORS.has(node.fn)) ||
  isParenthesisNode(node) ||
  (isFunctionNode(node) && node.fn.name === 'sqrt') ||
  // The name of the square root, as its call holds it: never a symbol alone.
  (node.type === 'SymbolNode' && path === 'fn');

/** The result, to twelve significant digits; throws, in words the model reads, on what is not arithmetic. */
export function calculate(expression: string): string {
  let tree: MathNode;
  try {
    tree = parse(expression);
  } catch {
    throw new Error('Ce calcul est illisible : écris-le avec des nombres et + - * / ^ % ( ) sqrt.');
  }
  if (tree.filter((node, path) => !arithmetic(node, path)).length > 0) {
    throw new Error('Ce calcul contient autre chose que des nombres et + - * / ^ % ( ) sqrt.');
  }
  return format(tree.evaluate() as number, { precision: 12 });
}
