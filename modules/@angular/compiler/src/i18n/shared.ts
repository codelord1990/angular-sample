/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {normalizeBlank} from '../../../router-deprecated/src/facade/lang';
import {Parser as ExpressionParser} from '../expression_parser/parser';
import {StringWrapper, isBlank, isPresent} from '../facade/lang';
import {HtmlAst, HtmlAstVisitor, HtmlAttrAst, HtmlCommentAst, HtmlElementAst, HtmlExpansionAst, HtmlExpansionCaseAst, HtmlTextAst, htmlVisitAll} from '../html_ast';
import {InterpolationConfig} from '../interpolation_config';
import {ParseError, ParseSourceSpan} from '../parse_util';

import {Message} from './message';

export const I18N_ATTR = 'i18n';
export const I18N_ATTR_PREFIX = 'i18n-';
const _CUSTOM_PH_EXP = /\/\/[\s\S]*i18n[\s\S]*\([\s\S]*ph[\s\S]*=[\s\S]*"([\s\S]*?)"[\s\S]*\)/g;

/**
 * An i18n error.
 */
export class I18nError extends ParseError {
  constructor(span: ParseSourceSpan, msg: string) { super(span, msg); }
}

export function partition(nodes: HtmlAst[], errors: ParseError[], implicitTags: string[]): Part[] {
  let parts: Part[] = [];

  for (let i = 0; i < nodes.length; ++i) {
    let node = nodes[i];
    let msgNodes: HtmlAst[] = [];
    // Nodes between `<!-- i18n -->` and `<!-- /i18n -->`
    if (isOpeningComment(node)) {
      let i18n = (<HtmlCommentAst>node).value.replace(/^i18n:?/, '').trim();

      while (++i < nodes.length && !isClosingComment(nodes[i])) {
        msgNodes.push(nodes[i]);
      }

      if (i === nodes.length) {
        errors.push(new I18nError(node.sourceSpan, 'Missing closing \'i18n\' comment.'));
        break;
      }

      parts.push(new Part(null, null, msgNodes, i18n, true));
    } else if (node instanceof HtmlElementAst) {
      // Node with an `i18n` attribute
      let i18n = getI18nAttr(node);
      let hasI18n: boolean = isPresent(i18n) || implicitTags.indexOf(node.name) > -1;
      parts.push(new Part(node, null, node.children, isPresent(i18n) ? i18n.value : null, hasI18n));
    } else if (node instanceof HtmlTextAst) {
      parts.push(new Part(null, node, null, null, false));
    }
  }

  return parts;
}

export class Part {
  constructor(
      public rootElement: HtmlElementAst, public rootTextNode: HtmlTextAst,
      public children: HtmlAst[], public i18n: string, public hasI18n: boolean) {}

  get sourceSpan(): ParseSourceSpan {
    if (isPresent(this.rootElement)) {
      return this.rootElement.sourceSpan;
    }
    if (isPresent(this.rootTextNode)) {
      return this.rootTextNode.sourceSpan;
    }

    return new ParseSourceSpan(
        this.children[0].sourceSpan.start, this.children[this.children.length - 1].sourceSpan.end);
  }

  createMessages(parser: ExpressionParser, interpolationConfig: InterpolationConfig): Message[] {
    let {message, icuMessages} = stringifyNodes(this.children, parser, interpolationConfig);
    return [
      new Message(message, meaning(this.i18n), description(this.i18n)),
      ...icuMessages.map(icu => new Message(icu, null))
    ];
  }
}

export function isOpeningComment(n: HtmlAst): boolean {
  return n instanceof HtmlCommentAst && isPresent(n.value) && n.value.startsWith('i18n');
}

export function isClosingComment(n: HtmlAst): boolean {
  return n instanceof HtmlCommentAst && isPresent(n.value) && n.value === '/i18n';
}

export function getI18nAttr(p: HtmlElementAst): HtmlAttrAst {
  return normalizeBlank(p.attrs.find(attr => attr.name === I18N_ATTR));
}

export function meaning(i18n: string): string {
  if (isBlank(i18n) || i18n == '') return '';
  return i18n.split('|')[0];
}

export function description(i18n: string): string {
  if (isBlank(i18n) || i18n == '') return '';
  let parts = i18n.split('|', 2);
  return parts.length > 1 ? parts[1] : '';
}

/**
 * Extract a translation string given an `i18n-` prefixed attribute.
 *
 * @internal
 */
export function messageFromI18nAttribute(
    parser: ExpressionParser, interpolationConfig: InterpolationConfig, p: HtmlElementAst,
    i18nAttr: HtmlAttrAst): Message {
  const expectedName = i18nAttr.name.substring(5);
  const attr = p.attrs.find(a => a.name == expectedName);

  if (attr) {
    return messageFromAttribute(
        parser, interpolationConfig, attr, meaning(i18nAttr.value), description(i18nAttr.value));
  }

  throw new I18nError(p.sourceSpan, `Missing attribute '${expectedName}'.`);
}

export function messageFromAttribute(
    parser: ExpressionParser, interpolationConfig: InterpolationConfig, attr: HtmlAttrAst,
    meaning: string = null, description: string = null): Message {
  const value = removeInterpolation(attr.value, attr.sourceSpan, parser, interpolationConfig);
  return new Message(value, meaning, description);
}

/**
 * Replace interpolation in the `value` string with placeholders
 */
export function removeInterpolation(
    value: string, source: ParseSourceSpan, expressionParser: ExpressionParser,
    interpolationConfig: InterpolationConfig): string {
  try {
    const parsed =
        expressionParser.splitInterpolation(value, source.toString(), interpolationConfig);
    const usedNames = new Map<string, number>();
    if (isPresent(parsed)) {
      let res = '';
      for (let i = 0; i < parsed.strings.length; ++i) {
        res += parsed.strings[i];
        if (i != parsed.strings.length - 1) {
          let customPhName = extractPhNameFromInterpolation(parsed.expressions[i], i);
          customPhName = dedupePhName(usedNames, customPhName);
          res += `<ph name="${customPhName}"/>`;
        }
      }
      return res;
    }

    return value;
  } catch (e) {
    return value;
  }
}

/**
 * Extract the placeholder name from the interpolation.
 *
 * Use a custom name when specified (ie: `{{<expression> //i18n(ph="FIRST")}}`) otherwise generate a
 * unique name.
 */
export function extractPhNameFromInterpolation(input: string, index: number): string {
  let customPhMatch = StringWrapper.split(input, _CUSTOM_PH_EXP);
  return customPhMatch.length > 1 ? customPhMatch[1] : `INTERPOLATION_${index}`;
}

export function extractPlaceholderName(input: string): string {
  const matches = StringWrapper.split(input, _CUSTOM_PH_EXP);
  return matches[1] || `interpolation`;
}


/**
 * Return a unique placeholder name based on the given name
 */
export function dedupePhName(usedNames: Map<string, number>, name: string): string {
  const duplicateNameCount = usedNames.get(name);

  if (duplicateNameCount) {
    usedNames.set(name, duplicateNameCount + 1);
    return `${name}_${duplicateNameCount}`;
  }

  usedNames.set(name, 1);
  return name;
}

/**
 * Convert a list of nodes to a string message.
 *
 */
export function stringifyNodes(
    nodes: HtmlAst[], expressionParser: ExpressionParser,
    interpolationConfig: InterpolationConfig): {message: string, icuMessages: string[]} {
  const visitor = new _StringifyVisitor(expressionParser, interpolationConfig);
  const icuMessages: string[] = [];
  const message = htmlVisitAll(visitor, nodes, icuMessages).join('');
  return {message, icuMessages};
}

class _StringifyVisitor implements HtmlAstVisitor {
  private _index: number = 0;
  private _nestedExpansion = 0;

  constructor(
      private _expressionParser: ExpressionParser,
      private _interpolationConfig: InterpolationConfig) {}

  visitElement(ast: HtmlElementAst, context: any): any {
    const index = this._index++;
    const children = this._join(htmlVisitAll(this, ast.children), '');
    return `<ph name="e${index}">${children}</ph>`;
  }

  visitAttr(ast: HtmlAttrAst, context: any): any { return null; }

  visitText(ast: HtmlTextAst, context: any): any {
    const index = this._index++;
    const noInterpolation = removeInterpolation(
        ast.value, ast.sourceSpan, this._expressionParser, this._interpolationConfig);
    if (noInterpolation != ast.value) {
      return `<ph name="t${index}">${noInterpolation}</ph>`;
    }
    return ast.value;
  }

  visitComment(ast: HtmlCommentAst, context: any): any { return ''; }

  visitExpansion(ast: HtmlExpansionAst, context: any): any {
    const index = this._index++;
    this._nestedExpansion++;
    const content = `{${ast.switchValue}, ${ast.type}${htmlVisitAll(this, ast.cases).join('')}}`;
    this._nestedExpansion--;

    return this._nestedExpansion == 0 ? `<ph name="x${index}">${content}</ph>` : content;
  }

  visitExpansionCase(ast: HtmlExpansionCaseAst, context: any): any {
    const expStr = htmlVisitAll(this, ast.expression).join('');
    return ` ${ast.value} {${expStr}}`;
  }

  private _join(strs: string[], str: string): string {
    return strs.filter(s => s.length > 0).join(str);
  }
}
