var formatAtRuleParams = require('./formatAtRuleParams')
var formatDecls = require('./formatDecls')
var getIndent = require('./getIndent')
var hasRules = require('./hasRules')
var hasDecls = require('./hasDecls')
var hasBlock = require('./hasBlock')
var util = require('./util')
var getProperty = util.getProperty
var getOptions = util.getOptions

function formatAtRules (root, params) {
  var stylelint = params.stylelint
  var indentWidth = params.indentWidth

  root.walkAtRules(function (atrule, index) {

    var parentType = atrule.parent.type
    var sassAtBlockTypes = [
      'mixin',
      'function',
      'for',
      'each',
      'while',
      'if',
      'else'
    ]
    var prev = atrule.prev()
    var isPrevRule = prev && prev.type === 'rule'
    var isPrevSassAtBlock = prev && sassAtBlockTypes.indexOf(prev.name) > -1
    var hasLineBreaksBefore = /[\n]{2}/.test(atrule.raws.before)
    var atruleBefore
    var indentation = getIndent(atrule, indentWidth)

    formatDecls(atrule, indentation, indentWidth)
    if (index === 0 && parentType === 'root') {
      atruleBefore = ''
    } else {
      if (parentType === 'atrule' || parentType === 'rule') {
        if (atrule.parent.first === atrule) {
          atruleBefore = '\n' + indentation
        } else {
          atruleBefore = '\n\n' + indentation
        }

      }

      if (parentType === 'root') {
        atruleBefore = '\n\n' + indentation
      }

      if (atrule.name === 'import') {
        atruleBefore = '\n' + indentation
      }

      if (atrule.name === 'else') {
        atruleBefore = ' '
      }

      var previous = atrule.prev()
      if (previous && previous.type === 'comment') {
        var nlCount = atrule.raws.before.split('\n').length - 1
        if (nlCount) {
          atruleBefore = '\n'.repeat(nlCount) + indentation
        }
      }
    }

    atrule.params = formatAtRuleParams(atrule, params)
    atrule.raws.before = atruleBefore
    atrule.raws.after = '\n' + indentation
    atrule.raws.between = ' '
    atrule.raws.semicolon = true
    atrule.raws.afterName = ' '

    atrule.raws.between = blockOpeningBraceNewlineBefore(atrule, {
      atruleBefore: atruleBefore,
      indentation: indentation,
      stylelint: stylelint
    })

    if (atrule.name === 'import' || atrule.name === 'charset') {
      atrule.raws.between = ''
    }

    if (atrule.name === 'else' && !isElseIf(atrule.params)) {
      atrule.raws.afterName = ''
    }

    if (atrule.name === 'if' || atrule.name === 'else') {
      formatDecls(atrule, indentation, indentWidth)
    }

    if (atrule.name === 'font-face') {
      atrule.raws.afterName = ''
      formatDecls(atrule, indentation, indentWidth)
    }

    if (atrule.name === 'mixin') {
      atrule.params = atrule.params.replace(/(^[\w|-]+)\s*\(/, "$1(")
      formatDecls(atrule, indentation, indentWidth)
    }

    if (atrule.name === 'extend' ||
        atrule.name === 'debug'  ||
        atrule.name === 'warn'   ||
        atrule.name === 'error' ) {
      atrule.params = atrule.params.replace(/\s+/g, " ")
      atrule.raws.before = '\n' + indentation
      atrule.raws.between = ''
    }

    if (atrule.name === 'warn' || atrule.name === 'error') {
      atrule.params = atrule.params.replace(/("|')\s*/g, '"')
      atrule.params = atrule.params.replace(/\s*("|')/g, '"')
    }

    if (atrule.name === 'content') {
      atrule.raws.before = '\n' + indentation
      atrule.raws.between = ''
      atrule.raws.afterName = ''
    }

    if (atrule.name === 'include') {
      atrule.params = atrule.params.replace(/(^[\w|-]+)\s*\(/, "$1(")
      atrule.params = atrule.params.replace(/\)\s*{/g, ') ')
      if (!hasLineBreaksBefore) {
        atrule.raws.before = '\n' + indentation
      }

      if (atrule.parent.type === 'root') {

        if (hasLineBreaksBefore || isPrevRule || isPrevSassAtBlock) {
          atrule.raws.before = '\n\n' + indentation
        }

        if (index === 0) {
          atrule.raws.before = ''
        }
      }

      if (!hasRules(atrule) && !hasDecls(atrule)) {
        atrule.raws.between = ''
      }
    }

    if (atrule.name === 'function') {
      atrule.raws.before = indentation
      atrule.raws.between = ' '

      if (atrule.parent.type === 'root') {
        atrule.raws.before = '\n\n' + indentation

        if (index === 0) {
          atrule.raws.before = ''
        }
      }
    }

    if (atrule.name === 'return'          ||
        atrule.name === 'custom-media'    ||
        atrule.name === 'custom-selector' ||
        atrule.name === 'apply'           ||
        atrule.name === 'at-root'         ||
        /viewport$/.test(atrule.name)) {
      atrule.raws.between = ''
    }

    var atRuleEmptyLineBefore = getProperty(params.stylelint, 'at-rule-empty-line-before')

    if (atRuleEmptyLineBefore) {
      var options = getOptions(params.stylelint, 'at-rule-empty-line-before', 'except')
      atRuleEmptyLineBefore = atRuleEmptyLineBefore === 'always'

      if(options.indexOf('blockless-group') > -1) {

        if (isBlocklessGroup(prev, atrule)) {
          atRuleEmptyLineBefore = !atRuleEmptyLineBefore
        }
      }

      if (index === 0 && parentType === 'root') {
        atrule.raws.before = ''
      } else {

        if (atRuleEmptyLineBefore) {
          atrule.raws.before = '\n\n' + indentation
        } else {
          atrule.raws.before = '\n' + indentation
        }
      }
    }

  })

  return root
}

function isBlocklessGroup (prev, atrule) {
  return (
    prev && prev.type === "atrule"
    && !hasBlock(prev)
    && !hasBlock(atrule)
  )
}

function blockOpeningBraceNewlineBefore (atrule, opts) {
  if (isIgnoreRule(opts.stylelint, atrule)) {
    return atrule.raws.between
  }
  switch (opts.stylelint['block-opening-brace-newline-before']) {
    case 'always':
      return '\n' + opts.indentation
    case 'always-single-line':
      if (opts.isSingleLine) {
        return atrule.raws.between
      }
      return '\n'
    case 'never-single-line':
      if (opts.isSingleLine) {
        return ''
      }
      return atrule.raws.between
    case 'always-multi-line':
      if (opts.isSingleLine) {
        return atrule.raws.between
      }
      return ' '
    case 'never-multi-line':
      if (opts.isSingleLine) {
        return atrule.raws.between
      }
      return ''
    default:
      return atrule.raws.between
  }
}

function isIgnoreRule (stylelint, css) {
  if (!stylelint.ignoreAtRules) {
    return false
  }
  return stylelint.ignoreAtRules.some(function (ignoreRules) {
    return css.match(new RegExp(ignoreRules, 'g'))
  })
}

function isElseIf (params) {
	return /if/.test(params)
}

module.exports = formatAtRules
