'use strict';

var anymatch = require('./');
var assert = require('assert');
var path = require('path');

describe('anymatch', () => {
  var matchers = [
    'path/to/file.js',
    'path/anyjs/**/*.js',
    /foo.js$/,
    (string => string.indexOf('/bar') !== -1 && string.length > 10)
  ];
  it('should resolve string matchers', () => {
    assert(anymatch(matchers, 'path/to/file.js'));
    assert(anymatch(matchers[0], 'path/to/file.js'));
    assert(!anymatch(matchers[0], 'bar.js'));
  });
  it('should resolve glob matchers', () => {
    assert.equal(true, anymatch(matchers, 'path/anyjs/baz.js'));
    assert.equal(true, anymatch(matchers[1], 'path/anyjs/baz.js'));
    assert.equal(false, anymatch(matchers[1], 'bar.js'));
  });
  it('should resolve regexp matchers', () => {
    assert.equal(true, anymatch(matchers, 'path/to/foo.js'));
    assert.equal(true, anymatch(matchers[2], 'path/to/foo.js'));
    assert.equal(false, anymatch(matchers[2], 'bar.js'));
  });
  it('should resolve function matchers', () => {
    assert.equal(true, anymatch(matchers, 'path/to/bar.js'));
    assert.equal(true, anymatch(matchers[3], 'path/to/bar.js'));
    assert.equal(false, anymatch(matchers[3], 'bar.js'));
  });
  it('should return false for unmatched strings', () => {
    assert.equal(false, anymatch(matchers, 'bar.js'));
  });
  it('should ignore improperly typed matchers', () => {
    var emptyObj = {};
    assert.equal(false, anymatch(emptyObj, ''));
    assert.equal(false, anymatch(Infinity, ''));
  });

  describe('with returnIndex = true', () => {
    it('should return the array index of first positive matcher', () => {
      var result = anymatch(matchers, 'foo.js', true);
      assert.equal(result, 2);
    });
    it('should return 0 if provided non-array matcher', () => {
      var result = anymatch(matchers[2], 'foo.js', true);
      assert.equal(result, 0);
    });
    it('should return -1 if no match', () => {
      var result = anymatch(matchers, 'bar.js', true);
      assert.equal(result, -1);
    });
  });

  describe('curried matching function', () => {
    var matchFn;
    before(() => {
      matchFn = anymatch(matchers);
    });
    it('should resolve matchers', () => {
      assert.equal(true, matchFn('path/to/file.js'));
      assert.equal(true, matchFn('path/anyjs/baz.js'));
      assert.equal(true, matchFn('path/to/foo.js'));
      assert.equal(true, matchFn('path/to/bar.js'));
      assert.equal(false, matchFn('bar.js'));
    });
    it('should be usable as an Array.prototype.filter callback', () => {
      var arr = [
        'path/to/file.js',
        'path/anyjs/baz.js',
        'path/to/foo.js',
        'path/to/bar.js',
        'bar.js',
        'foo.js'
      ];
      var expected = arr.slice();
      expected.splice(arr.indexOf('bar.js'), 1);
      assert.deepEqual(arr.filter(matchFn), expected);
    });
    it('should bind individual criterion', () => {
      assert(anymatch(matchers[0])('path/to/file.js'));
      assert(!anymatch(matchers[0])('path/to/other.js'));
      assert(anymatch(matchers[1])('path/anyjs/baz.js'));
      assert(!anymatch(matchers[1])('path/to/baz.js'));
      assert(anymatch(matchers[2])('path/to/foo.js'));
      assert(!anymatch(matchers[2])('path/to/foo.js.bak'));
      assert(anymatch(matchers[3])('path/to/bar.js'));
      assert(!anymatch(matchers[3])('bar.js'));
    });
  });

  describe('extra args', () => {
    it('should not allow no args', () => {
      assert.throws(() => anymatch());
    })
    it('should not allow string to be passed as first member of an array', () => {
      assert.throws(() => anymatch(matchers, ['path/to/bar.js']));
    });
  });

  describe('glob negation', () => {
    after(matchers.splice.bind(matchers, 4, 2));

    it('should respect negated globs included in a matcher array', () => {
      assert(anymatch(matchers, 'path/anyjs/no/no.js'), 'matches existing glob');
      matchers.push('!path/anyjs/no/*.js');
      assert(!anymatch(matchers, 'path/anyjs/no/no.js'), 'should be negated');
      assert(!anymatch(matchers)('path/anyjs/no/no.js'), 'should be negated (curried)');
    });
    it('should not break returnIndex option', () => {
      assert.equal(anymatch(matchers, 'path/anyjs/yes.js', true), 1);
      assert.equal(anymatch(matchers)('path/anyjs/yes.js', true), 1);
      assert.equal(anymatch(matchers, 'path/anyjs/no/no.js', true), -1);
      assert.equal(anymatch(matchers)('path/anyjs/no/no.js', true), -1);
    });
    it('should allow negated globs to negate non-glob matchers', () => {
      assert.equal(anymatch(matchers, 'path/to/bar.js', true), 3);
      matchers.push('!path/to/bar.*');
      assert(!anymatch(matchers, 'path/to/bar.js'));
    });
  });

  describe('windows paths', () => {
    var origSep = path.sep;
    before(() => {
      path.sep = '\\';
    });
    after(() => {
      path.sep = origSep;
    });

    it('should resolve backslashes against string matchers', () => {
      assert(anymatch(matchers, 'path\\to\\file.js'));
      assert(anymatch(matchers)('path\\to\\file.js'));
    });
    it('should resolve backslashes against glob matchers', () => {
      assert(anymatch(matchers, 'path\\anyjs\\file.js'));
      assert(anymatch(matchers)('path\\anyjs\\file.js'));
    });
    it('should resolve backslashes against regex matchers', () => {
      assert(anymatch(/path\/to\/file\.js/, 'path\\to\\file.js'));
      assert(anymatch(/path\/to\/file\.js/)('path\\to\\file.js'));
    });
    it('should resolve backslashes against function matchers', () => {
      assert(anymatch(matchers, 'path\\to\\bar.js'));
      assert(anymatch(matchers)('path\\to\\bar.js'));
    });
    it('should still correctly handle forward-slash paths', () => {
      assert(anymatch(matchers, 'path/to/file.js'));
      assert(anymatch(matchers)('path/to/file.js'));
      assert(!anymatch(matchers, 'path/no/no.js'));
      assert(!anymatch(matchers)('path/no/no.js'));
    });
  });
});
