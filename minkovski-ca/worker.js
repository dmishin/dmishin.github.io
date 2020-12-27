(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var bigInt = (function (undefined) {
    "use strict";

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
    //disable native bigint, because it causes performance degradation in small int case, which is the most common.
    var supportsNativeBigInt = false;//typeof BigInt === "function";

    function Integer(v, radix, alphabet, caseSensitive) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function NativeBigInt(value) {
        this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    NativeBigInt.prototype.add = function (v) {
        return new NativeBigInt(this.value + parseValue(v).value);
    }
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a, b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    NativeBigInt.prototype.subtract = function (v) {
        return new NativeBigInt(this.value - parseValue(v).value);
    }
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };
    NativeBigInt.prototype.negate = function () {
        return new NativeBigInt(-this.value);
    }

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function () {
        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    }


    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
        if (isPrecise(a.value * this.value)) {
            return new SmallInteger(a.value * this.value);
        }
        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
        if (a.value === 0) return Integer[0];
        if (a.value === 1) return this;
        if (a.value === -1) return this.negate();
        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    NativeBigInt.prototype.multiply = function (v) {
        return new NativeBigInt(this.value * parseValue(v).value);
    }
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

    function square(a) {
        //console.assert(2 * BASE * BASE < MAX_INT);
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            carry = 0 - a_i * a_i;
            for (var j = i; j < l; j++) {
                a_j = a[j];
                product = 2 * (a_i * a_j) + r[i + j] + carry;
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
            }
            r[i + l] = carry;
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    NativeBigInt.prototype.square = function (v) {
        return new NativeBigInt(this.value * this.value);
    }

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            trim(part);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        if (supportsNativeBigInt) {
            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
        }
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
        return new NativeBigInt(this.value / parseValue(v).value);
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
        return new NativeBigInt(this.value % parseValue(v).value);
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    NativeBigInt.prototype.pow = function (v) {
        var n = parseValue(v);
        var a = this.value, b = n.value;
        var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
        if (b === _0) return Integer[1];
        if (a === _0) return Integer[0];
        if (a === _1) return Integer[1];
        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.isNegative()) return new NativeBigInt(_0);
        var x = this;
        var y = Integer[1];
        while (true) {
            if ((b & _1) === _1) {
                y = y.times(x);
                --b;
            }
            if (b === _0) break;
            b /= _2;
            x = x.square();
        }
        return y;
    }

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        if (exp.isNegative()) {
            exp = exp.multiply(Integer[-1]);
            base = base.modInv(mod);
        }
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };
    NativeBigInt.prototype.compareAbs = function (v) {
        var a = this.value;
        var b = parseValue(v).value;
        a = a >= 0 ? a : -a;
        b = b >= 0 ? b : -b;
        return a === b ? 0 : a > b ? 1 : -1;
    }

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    NativeBigInt.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }
        var a = this.value;
        var b = parseValue(v).value;
        return a === b ? 0 : a > b ? 1 : -1;
    }
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function () {
        return (this.value & BigInt(1)) === BigInt(0);
    }

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function () {
        return (this.value & BigInt(1)) === BigInt(1);
    }

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function () {
        return this.abs().value === BigInt(1);
    }

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function () {
        return this.value === BigInt(0);
    }

    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        if (n.isZero()) return false;
        if (n.isUnit()) return true;
        if (n.compareAbs(2) === 0) return this.isEven();
        return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(49)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    function millerRabinTest(n, a) {
        var nPrev = n.prev(),
            b = nPrev,
            r = 0,
            d, t, i, x;
        while (b.isEven()) b = b.divide(2), r++;
        next: for (i = 0; i < a.length; i++) {
            if (n.lesser(a[i])) continue;
            x = bigInt(a[i]).modPow(b, n);
            if (x.isUnit() || x.equals(nPrev)) continue;
            for (d = r - 1; d != 0; d--) {
                x = x.square().mod(n);
                if (x.isUnit()) return false;
                if (x.equals(nPrev)) continue next;
            }
            return false;
        }
        return true;
    }

    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
    BigInteger.prototype.isPrime = function (strict) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var bits = n.bitLength();
        if (bits <= 64)
            return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
        var logN = Math.log(2) * bits.toJSNumber();
        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt(i + 2));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations, rng) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var t = iterations === undefined ? 5 : iterations;
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt.randBetween(2, n.minus(2), rng));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.isZero()) {
            q = r.divide(newR);
            lastT = t;
            lastR = r;
            t = newT;
            r = newR;
            newT = lastT.subtract(q.multiply(newT));
            newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
            t = t.add(n);
        }
        if (this.isNegative()) {
            return t.negate();
        }
        return t;
    };

    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function () {
        return new NativeBigInt(this.value + BigInt(1));
    }

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function () {
        return new NativeBigInt(this.value - BigInt(1));
    }

    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return Math.abs(n) <= BASE;
    }

    BigInteger.prototype.shiftLeft = function (v) {
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        if (result.isZero()) return result;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (v) {
        var remQuo;
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xDigit = 0, yDigit = 0;
        var xDivMod = null, yDivMod = null;
        var result = [];
        while (!xRem.isZero() || !yRem.isZero()) {
            xDivMod = divModAny(xRem, highestPower2);
            xDigit = xDivMod[1].toJSNumber();
            if (xSign) {
                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
            }

            yDivMod = divModAny(yRem, highestPower2);
            yDigit = yDivMod[1].toJSNumber();
            if (ySign) {
                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
            }

            xRem = xDivMod[0];
            yRem = yDivMod[0];
            result.push(fn(xDigit, yDigit));
        }
        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
        for (var i = result.length - 1; i >= 0; i -= 1) {
            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value,
            x = typeof v === "number" ? v | LOBMASK_I :
                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                    v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function integerLogarithm(value, base) {
        if (base.compareTo(value) <= 0) {
            var tmp = integerLogarithm(value, base.square(base));
            var p = tmp.p;
            var e = tmp.e;
            var t = p.multiply(base);
            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
        }
        return { p: bigInt(1), e: 0 };
    }

    BigInteger.prototype.bitLength = function () {
        var n = this;
        if (n.compareTo(bigInt(0)) < 0) {
            n = n.negate().subtract(bigInt(1));
        }
        if (n.compareTo(bigInt(0)) === 0) {
            return bigInt(0);
        }
        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    }
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b, rng) {
        a = parseValue(a);
        b = parseValue(b);
        var usedRNG = rng || Math.random;
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low).add(1);
        if (range.isSmall) return low.add(Math.floor(usedRNG() * range));
        var digits = toBase(range, BASE).value;
        var result = [], restricted = true;
        for (var i = 0; i < digits.length; i++) {
            var top = restricted ? digits[i] : BASE;
            var digit = truncate(usedRNG() * top);
            result.push(digit);
            if (digit < top) restricted = false;
        }
        return low.add(Integer.fromArray(result, BASE, false));
    }

    var parseBase = function (text, base, alphabet, caseSensitive) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        text = String(text);
        if (!caseSensitive) {
            text = text.toLowerCase();
            alphabet = alphabet.toLowerCase();
        }
        var length = text.length;
        var i;
        var absBase = Math.abs(base);
        var alphabetValues = {};
        for (i = 0; i < alphabet.length; i++) {
            alphabetValues[alphabet[i]] = i;
        }
        for (i = 0; i < length; i++) {
            var c = text[i];
            if (c === "-") continue;
            if (c in alphabetValues) {
                if (alphabetValues[c] >= absBase) {
                    if (c === "1" && absBase === 1) continue;
                    throw new Error(c + " is not a valid digit in base " + base + ".");
                }
            }
        }
        base = parseValue(base);
        var digits = [];
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i];
            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">" && i < text.length);
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        return parseBaseFromArray(digits, base, isNegative);
    };

    function parseBaseFromArray(digits, base, isNegative) {
        var val = Integer[0], pow = Integer[1], i;
        for (i = digits.length - 1; i >= 0; i--) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    }

    function stringify(digit, alphabet) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        if (digit < alphabet.length) {
            return alphabet[digit];
        }
        return "<" + digit + ">";
    }

    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return { value: [0], isNegative: false };
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return { value: [0], isNegative: false };
            if (n.isNegative())
                return {
                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                        .map(Array.prototype.valueOf, [1, 0])
                    ),
                    isNegative: false
                };

            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                .map(Array.prototype.valueOf, [0, 1]);
            arr.unshift([1]);
            return {
                value: [].concat.apply([], arr),
                isNegative: false
            };
        }

        var neg = false;
        if (n.isNegative() && base.isPositive()) {
            neg = true;
            n = n.abs();
        }
        if (base.isUnit()) {
            if (n.isZero()) return { value: [0], isNegative: false };

            return {
                value: Array.apply(null, Array(n.toJSNumber()))
                    .map(Number.prototype.valueOf, 1),
                isNegative: neg
            };
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(digit.toJSNumber());
        }
        out.push(left.toJSNumber());
        return { value: out.reverse(), isNegative: neg };
    }

    function toBaseString(n, base, alphabet) {
        var arr = toBase(n, base);
        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
            return stringify(x, alphabet);
        }).join('');
    }

    BigInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    SmallInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    NativeBigInt.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    BigInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix !== 10) return toBaseString(this, radix, alphabet);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };

    SmallInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined) radix = 10;
        if (radix != 10) return toBaseString(this, radix, alphabet);
        return String(this.value);
    };

    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); }

    BigInteger.prototype.valueOf = function () {
        return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
        return parseInt(this.toString(), 10);
    }

    function parseStringValue(v) {
        if (isPrecise(+v)) {
            var x = +v;
            if (x === truncate(x))
                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
            throw new Error("Invalid integer: " + v);
        }
        var sign = v[0] === "-";
        if (sign) v = v.slice(1);
        var split = v.split(/e/i);
        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
        if (split.length === 2) {
            var exp = split[1];
            if (exp[0] === "+") exp = exp.slice(1);
            exp = +exp;
            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
            var text = split[0];
            var decimalPlace = text.indexOf(".");
            if (decimalPlace >= 0) {
                exp -= text.length - decimalPlace - 1;
                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
            }
            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
            text += (new Array(exp + 1)).join("0");
            v = text;
        }
        var isValid = /^([0-9][0-9]*)$/.test(v);
        if (!isValid) throw new Error("Invalid integer: " + v);
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(sign ? "-" + v : v));
        }
        var r = [], max = v.length, l = LOG_BASE, min = max - l;
        while (max > 0) {
            r.push(+v.slice(min, max));
            min -= l;
            if (min < 0) min = 0;
            max -= l;
        }
        trim(r);
        return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(v));
        }
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        if (typeof v === "bigint") {
            return new NativeBigInt(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = parseValue(i);
        if (i > 0) Integer[-i] = parseValue(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
    Integer.randBetween = randBetween;

    Integer.fromArray = function (digits, base, isNegative) {
        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };

    return Integer;
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}

//amd check
if (typeof define === "function" && define.amd) {
    define( function () {
        return bigInt;
    });
}

},{}],2:[function(require,module,exports){
var bigInt, possibleSquares, small, sqrtBig, supportsNativeBigInt;

bigInt = require("big-integer");

//disable native bigint, because it causes performance degradation in small int case, which is the most common.
supportsNativeBigInt = false;

if (!supportsNativeBigInt) {
  /*
  #find integer sqare root using Newton method
  #returns a tuple: (floor(sqrt(x)) :: LongInteger, is_exact_root :: bool)
   */
  //old implementation
  exports.sqrt = function(x) {
    var q;
    if (x.isNegative()) {
      throw new Error("Negative argument");
    }
    if (x.isSmall) {
      q = Math.floor(Math.sqrt(x.value)) | 0;
      return [bigInt(q), q * q === x.value];
    } else {
      return sqrtBig(x);
    }
  };
  exports.bigIntHash = function(x) {
    var hash, i, len, part, ref;
    if (x.isSmall) {
      return x.value;
    } else {
      hash = x.sign ? 0 : 1;
      ref = x.value;
      for (i = 0, len = ref.length; i < len; i++) {
        part = ref[i];
        hash = (((hash << 5) - hash) + part) | 0;
      }
      return hash;
    }
  };
  sqrtBig = function(x) {
    var d, q, r, xi, xi1;
    //rough estimate of the square root magnitude
    // this uses the fact that BigInteger stores value as a groups of 7 decimal digits. 
    xi = bigInt(10).pow((x.value.length * 7 / 2) | 0);
    while (true) {
      ({
        quotient: q,
        remainder: r
      } = x.divmod(xi));
      xi1 = xi.add(q).divide(2);
      d = xi1.minus(xi);
      xi = xi1;
      if (d.isSmall && (d.value === 0 || d.value === 1)) {
        break;
      }
    }
    return [xi, r.isZero()];
  };
  // returns True if X can be square
  possibleSquares = (function() {
    var i, p, ref, sqs, x;
    sqs = {};
    p = 10000;
    for (x = i = 0, ref = p; (0 <= ref ? i < ref : i > ref); x = 0 <= ref ? ++i : --i) {
      sqs[(x * x) % p] = true;
    }
    return sqs;
  })();
  exports.possibleSquare = function(x) {
    if (x.isNegative()) {
      return false;
    }
    return possibleSquares.hasOwnProperty(x.isSmall ? x.value % 10000 : x.value[0] % 10000);
  };
} else {
  //New implementation that works with bigints  
  exports.sqrt = function(x_) {
    var q, sx, x;
    x = x_.value;
    if (x < 0) {
      throw new Error("Negative argument");
    }
    if (small(x)) {
      sx = Number(x);
      q = Math.floor(Math.sqrt(sx)) | 0;
      return [bigInt(q), q * q === sx];
    } else {
      return sqrtBig(x);
    }
  };
  exports.bigIntHash = function(x_) {
    var hash, part, x;
    x = x_.value;
    if (small(x)) {
      return Number(x);
    } else {
      if (x < 0) {
        hash = 1;
        x = -x;
      } else {
        hash = 0;
      }
      while (x) {
        
        //for part in x.value
        part = Number(x & 0xffffffffffffn); //48 bits
        x = x >> 48n;
        hash = (((hash << 5) - hash) + part) | 0;
      }
      return hash;
    }
  };
  small = function(x) {
    return x <= Number.MAX_SAFE_INTEGER && x >= Number.MIN_SAFE_INTEGER;
  };
  sqrtBig = function(x) {
    var d, r, xi, xi1;
    //rough estimate of the square root magnitude
    // this uses the fact that BigInteger stores value as a groups of 7 decimal digits.
    xi = 1n;
    while (true) {
      r = x % xi;
      xi1 = (xi + x / xi) >> 1n;
      d = xi1 - xi;
      xi = xi1;
      if (d === 0n || d === 1n) {
        break;
      }
    }
    return [bigInt(xi), r === 0n];
  };
  // returns True if X can be square
  possibleSquares = (function() {
    var _, i, sqs, x;
    sqs = (function() {
      var i, results;
      results = [];
      for (_ = i = 0; i < 256; _ = ++i) {
        results.push(false);
      }
      return results;
    })();
    for (x = i = 0; i < 256; x = ++i) {
      sqs[(x * x) % 256] = true;
    }
    return sqs;
  })();
  exports.possibleSquare = function(x_) {
    var x;
    x = x_.value;
    if (x < 0) {
      return false;
    } else {
      return possibleSquares[x & 0xffn];
    }
  };
}


},{"big-integer":1}],3:[function(require,module,exports){
"use strict";
var add, addScaledInplace, adjoint, bigInt, copy, det, diag, eq, eye, fromColumns, mul, mulv, pow, set, smul, sub, toColumns, tobig, tr, transpose, zero;

//Operations on 2x2 matrices
// Matrices stored as arrays, row by row
bigInt = require("big-integer");

exports.eye = eye = function() {
  return [bigInt[1], bigInt[0], bigInt[0], bigInt[1]];
};

exports.diag = diag = function(a, b) {
  return [a, bigInt[0], bigInt[0], b];
};

exports.zero = zero = function() {
  return [bigInt[0], bigInt[0], bigInt[0], bigInt[0]];
};

exports.set = set = function(m, i, j, v) {
  m[i * 2 + j] = v;
  return m;
};

exports.tobig = tobig = function(m) {
  var l, len, mi, results;
  results = [];
  for (l = 0, len = m.length; l < len; l++) {
    mi = m[l];
    results.push(bigInt(mi));
  }
  return results;
};

exports.eq = eq = function(m1, m2) {
  var i, l, len, m1i, m2i;
  for (i = l = 0, len = m1.length; l < len; i = ++l) {
    m1i = m1[i];
    m2i = m2[i];
    if (!m1i.eq(m2i)) {
      return false;
    }
  }
  return true;
};

exports.mul = mul = function(m1, m2) {
  var i, j, k, l, m, o, p, s;
  m = zero();
  for (i = l = 0; l < 2; i = ++l) {
    for (j = o = 0; o < 2; j = ++o) {
      s = bigInt[0];
      for (k = p = 0; p < 2; k = ++p) {
        s = s.add(m1[i * 2 + k].multiply(m2[k * 2 + j]));
      }
      m[i * 2 + j] = s;
    }
  }
  return m;
};

exports.copy = copy = function(m) {
  return m.slice(0);
};

exports.mulv = mulv = function(m, v) {
  return [m[0].multiply(v[0]).add(m[1].multiply(v[1])), m[2].multiply(v[0]).add(m[3].multiply(v[1]))];
};

exports.adjoint = adjoint = function(m) {
  return [m[3], m[1].negate(), m[2].negate(), m[0]];
};

exports.smul = smul = function(k, m) {
  var l, len, mi, results;
  results = [];
  for (l = 0, len = m.length; l < len; l++) {
    mi = m[l];
    results.push(mi.multiply(k));
  }
  return results;
};

exports.add = add = function(m1, m2) {
  var i, l, results;
  results = [];
  for (i = l = 0; l < 4; i = ++l) {
    results.push(m1[i].add(m2[i]));
  }
  return results;
};

exports.sub = sub = function(m1, m2) {
  var i, l, results;
  results = [];
  for (i = l = 0; l < 4; i = ++l) {
    results.push(m1[i].subtract(m2[i]));
  }
  return results;
};

exports.addScaledInplace = addScaledInplace = function(m, m1, k) {
  var i, l, ref;
  for (i = l = 0, ref = m.length; (0 <= ref ? l < ref : l > ref); i = 0 <= ref ? ++l : --l) {
    m[i] = m[i].add(m1[i].multiply(k));
  }
  return m;
};

exports.transpose = transpose = function(m) {
  return [m[0], m[2], m[1], m[3]];
};

/*  array of matrix powers, from 0th to (n-1)th
*/
exports.powers = function(matrix, n) {
  var i, l, m_n, pows, ref;
  //current power
  m_n = eye();
  pows = [m_n];
  for (i = l = 1, ref = n; (1 <= ref ? l < ref : l > ref); i = 1 <= ref ? ++l : --l) {
    m_n = mul(matrix, m_n);
    pows.push(m_n);
  }
  return pows;
};

/* Calcualte eigenvectors
*/
exports.det = det = function(m) {
  var a, b, c, d;
  [a, b, c, d] = m;
  return a.multiply(d).subtract(b.multiply(c));
};

exports.fromColumns = fromColumns = function([a, b], [c, d]) {
  return [a, c, b, d];
};

exports.toColumns = toColumns = function([a, c, b, d]) {
  return [[a, b], [c, d]];
};

exports.qformSmallA = function([a, b, c, d], [x1, x2]) {
  var y1, y2, y3;
  y1 = x1.multiply(x1).multiply(a);
  y2 = x1.multiply(x2).multiply(b + c);
  y3 = x2.multiply(x2).multiply(d);
  return y1.add(y2).add(y3);
};

exports.addv = function([x1, x2], [y1, y2]) {
  return [x1.add(y1), x2.add(y2)];
};

exports.subv = function([x1, x2], [y1, y2]) {
  return [x1.subtract(y1), x2.subtract(y2)];
};

exports.pow = pow = function(m, n) {
  var mp, mp2;
  if (n < 0) {
    throw new Error("Won't calculate negative power now");
  }
  if (n === 0) {
    return eye();
  } else if (n === 1) {
    return m;
  } else {
    mp2 = pow(m, n >> 1);
    mp = mul(mp2, mp2);
    if (n & 0x1) {
      return mul(m, mp);
    } else {
      return mp;
    }
  }
};

exports.tr = tr = function(m) {
  return m[0].add(m[3]);
};


},{"big-integer":1}],4:[function(require,module,exports){
"use strict";
var BM, ConnectedCell, Coord, M, bigInt, calculateConnections, commonNeighbors, conicsIntersection, conicsIntersection2, divIntVector, iterateItemPairs, newCoordHash, possibleSquare, qform, sqrt, tfm2qform;

bigInt = require("big-integer");

({qform, tfm2qform} = require("./mathutil.coffee"));

({Coord, newCoordHash} = require("./world.coffee"));

M = require("./matrix2.coffee");

BM = require("./bigmatrix.coffee");

({sqrt, possibleSquare} = require("./bigmath.coffee"));

/* Finds integer intersection of two conics x'Ax=c, separated by vector p
 *   if no intersecitons found, returns null
 *   a - small matrix
 *   p - big vector
 *   c - small number
 */
exports.conicsIntersection = conicsIntersection = function(a, c, p, pap) {
  var Dden, Dnum, da, g, isExactSquare, m, qden, qnum, ra, rapx, rapx1, rapy, rapy1, twox1, twox2;
  //console.log {P:p}
  pap = pap != null ? pap : BM.qformSmallA(a, p);
  if (pap.isZero()) {
    return [];
  }
  da = M.det(a);
  ra = BM.tobig(M.mul([0, -1, 1, 0], a));
  Dnum = bigInt(4 * c).subtract(pap);
  Dden = pap.multiply(da);
  //console.log {pap:pap, "|a|":da, num: Dnum, den: Dden}

  //one root, single neighbor
  if (Dnum.isZero()) {
    if (p[0].isOdd() || p[1].isOdd()) {
      return [];
    } else {
      return [[p[0].divide(2), p[1].divide(2)]];
    }
  }
  
  //move sign to the numerator.
  if (Dden.isNegative()) {
    Dnum = Dnum.negate();
    Dden = Dden.negate();
  }
  if (Dnum.isNegative()) { //no solutions at all
    return [];
  }
  
  //simplify the fraction, or else we can't take square root for sure.
  g = bigInt.gcd(Dnum, Dden);
  Dnum = Dnum.divide(g);
  Dden = Dden.divide(g);
  //console.log {gcd:g, num: Dnum, den: Dden}

  //calculate its root
  //first, quick ckeck. mut increase performance, but I don't conw for true.
  if (!possibleSquare(Dnum) || !possibleSquare(Dden)) {
    return [];
  }
  //then, real calculation  
  [qnum, isExactSquare] = sqrt(Dnum); //big root
  if (!isExactSquare) {
    return [];
  }
  //not a full square
  [qden, isExactSquare] = sqrt(Dden);
  if (!isExactSquare) {
    return [];
  }
  //console.log {qnum:qnum, qden: qden}
  //not a fu;ll square again
  [rapx, rapy] = BM.smul(qnum, BM.mulv(ra, p));
  ({
    //console.log {rapx:rapx, rapy:rapy}
    quotient: rapx1,
    remainder: m
  } = rapx.divmod(qden));
  if (!m.isZero()) {
    return [];
  }
  ({
    quotient: rapy1,
    remainder: m
  } = rapy.divmod(qden));
  if (!m.isZero()) {
    return [];
  }
  //console.log {rapx1:rapx1, rapy1:rapy1}
  twox1 = [p[0].add(rapx1), p[1].add(rapy1)];
  if (twox1[0].isOdd() || twox1[1].isOdd()) {
    return [];
  }
  
  //if one vector is divisible by 2, then the other one is divisible too, no need to check
  twox1 = [twox1[0].divide(2), twox1[1].divide(2)];
  twox2 = [p[0].subtract(rapx1).divide(2), p[1].subtract(rapy1).divide(2)];
  //console.log {twox1:twox1, twox2:twox2}
  return [twox1, twox2];
};

/* Intersection of 2 different conics:
 *   x'Ax = c1
 *   (x-p)'A(x-p) = c2
 *
 *   Returns 1 or 2 integer solutions or empty list, if no.
 *
 * \frac{
 *    p(c_1-c_2 + pap) + q\sqrt{
 *        -\frac1{da}\left((pap-c_1-c_2)^2-4c_1c_2\right)
 *    }
 *  }{
 *    2 pap
 *  }
 */
exports.conicsIntersection2 = conicsIntersection2 = function(a, c1, c2, p, pap) {
  var alpha, da, isExactSquare, pap2, r, ra, rda, rem, ret, scaled_p, scaled_q, sqrt_rda, v;
  pap = pap != null ? pap : BM.qformSmallA(a, p);
  if (pap.isZero()) {
    return [];
  }
  da = M.det(a);
  ra = BM.tobig(M.mul([0, -1, 1, 0], a));
  //expression under the root
  // 1/da * ((pap-c_1-c_2)^2-4c_1c_2)
  r = pap.subtract(c1 + c2).square().subtract(4 * c1 * c2);
  if (((da < 0) && r.isNegative()) || ((da > 0) && r.isPositive())) {
    return [];
  }
  
  //console.log "r is = #{r}"
  if (r.isZero()) {
    //special case of single intersection (touching hyperboloids or ellipses)

    // p(c_1-c_2 + pap) / (2pap)
    v = divIntVector(BM.smul(pap.add(c1 - c2), p), pap.multiply(2));
    if (v === null) {
      return [];
    } else {
      return [v];
    }
  }
  ({
    
    //divide by -da. if not divisible - no solution
    quotient: rda,
    remainder: rem
  } = r.divmod(-da));
  if (!rem.isZero()) {
    return [];
  }
  //calculate quare root
  [sqrt_rda, isExactSquare] = sqrt(rda);
  if (!isExactSquare) {
    return [];
  }
  //coeff before p
  // c_1-c_2 + pap
  alpha = pap.add(c1 - c2);
  //finally, calculate the vector
  scaled_p = BM.smul(alpha, p);
  scaled_q = BM.smul(sqrt_rda, BM.mulv(ra, p));
  //and their sum must be divisible by 2 pap
  pap2 = pap.multiply(2);
  ret = [];
  v = divIntVector(BM.addv(scaled_p, scaled_q), pap2);
  if (v !== null) {
    ret.push(v);
  }
  v = divIntVector(BM.subv(scaled_p, scaled_q), pap2);
  if (v !== null) {
    ret.push(v);
  }
  return ret;
};

divIntVector = function([x, y], k) {
  var r, xk, yk;
  ({
    quotient: xk,
    remainder: r
  } = x.divmod(k));
  if (!r.isZero()) {
    return null;
  }
  ({
    quotient: yk,
    remainder: r
  } = y.divmod(k));
  if (!r.isZero()) {
    return null;
  }
  return [xk, yk];
};


//Find common neighbors of 2 cells. List of either 0, 1 or 2 Coord instances.
// pap is optional, magnitude of the coord1-coord2 vector
exports.commonNeighbors = commonNeighbors = function(A, c, coord1, coord2, pap) {
  var decomp, l, len, results, v, vi;
  v = coord1.offset(coord2);
  //now try to decompose v into sum of 2 vectors of norm xAx == c.
  decomp = conicsIntersection(A, c, v, pap);
  results = [];
  for (l = 0, len = decomp.length; l < len; l++) {
    vi = decomp[l];
    results.push(coord1.translate(vi));
  }
  return results;
};

//calls callback function for all different key-value pairs in the CustomHashMap
exports.iterateItemPairs = iterateItemPairs = function(customHashMap, onCellPair) {
  var previous;
  previous = [];
  return customHashMap.iter(function(kv) {
    var kv1, l, len;
    for (l = 0, len = previous.length; l < len; l++) {
      kv1 = previous[l];
      onCellPair(kv, kv1);
    }
    previous.push(kv);
  });
};

exports.ConnectedCell = ConnectedCell = class ConnectedCell {
  //coord is stored for drawing purposes. ALso, to use "is" to check for equality. WIth coord, real equality check is needed.
  constructor(coord, value) {
    this.coord = coord;
    this.value = value;
    this.neighbors = []; //list of neighbor ConnectedCells
  }

  addNeighborIfNotYet(n) {
    if (this.neighbors.indexOf(n) === -1) {
      this.neighbors.push(n);
      return true;
    } else {
      return false;
    }
  }

  removeNeighbor(n) {
    var idx;
    idx = this.neighbors.indexOf(n);
    if (idx !== -1) {
      return this.neighbors.splice(idx, 1);
    } else {
      throw new Error("Attempt to remove neighbor that is already removed");
    }
  }

  //calculate generalized neighbor sum for the derived cell
  sum(rule) {
    var l, len, neighbor, ref, s;
    s = rule.foldInitial;
    ref = this.neighbors;
    for (l = 0, len = ref.length; l < len; l++) {
      neighbor = ref[l];
      s = rule.fold(s, neighbor.value);
    }
    return s;
  }

};

//Takes world and calculates enriched structure, where each cell knows its neighbors
// and initially empty cells with 2 or more neighbors are present.

// Returned value is hash map with Coord key and ConnectedCell value
exports.calculateConnections = calculateConnections = function(world) {
  var connections, previous;
  //key is coord, value is ConnectedCell
  connections = newCoordHash();
  previous = [];
  world.cells.iter(function(kv) {
    var c1, c2, ci, dv, dv1, i, intersections, j, l, len, len1, len2, len3, len4, mag, neighborCoord, neighbors, o, q, ref, ref1, ref2, richCell, richCell2, richNeighborCell, t, u, w;
    //found a non-empty cell. it *must* be not present yet in the conencted map.
    richCell = new ConnectedCell(kv.k, kv.v);
    connections.put(kv.k, richCell);
// Now iterate all other cells that were visited before this.
    for (l = 0, len = previous.length; l < len; l++) {
      richCell2 = previous[l];
      // first find neighbors. To do this, calculate interval
      // offset vector from the original cell to this.
      dv = kv.k.offset(richCell2.coord);
      // magniture of the distance vector, bigint.
      mag = world.pnorm2(dv);
      ref = world.c;
      for (o = 0, len1 = ref.length; o < len1; o++) {
        ci = ref[o];
        if (mag.equals(ci)) {
          //if it is a neighbor, it must be a new neighbor. registe the connection without additional checks
          richCell.neighbors.push(richCell2);
          richCell2.neighbors.push(richCell);
          break;
        }
      }
      ref1 = world.c;
      
      //also, these 2 cells might have common neighbor.
      // (is it possible when they are neighbors? At least, for some grids (hexagonal) it is true.
      for (i = q = 0, len2 = ref1.length; q < len2; i = ++q) {
        c1 = ref1[i];
        for (j = t = 0, ref2 = i; (0 <= ref2 ? t <= ref2 : t >= ref2); j = 0 <= ref2 ? ++t : --t) {
          c2 = world.c[j];
          intersections = i === j ? conicsIntersection(world.a, c1, dv, mag) : conicsIntersection2(world.a, c1, c2, dv, mag);
          for (u = 0, len3 = intersections.length; u < len3; u++) {
            dv1 = intersections[u];
            neighbors = i === j ? [kv.k.translate(dv1)] : [kv.k.translate(dv1), richCell2.coord.translateBack(dv1)];
            for (w = 0, len4 = neighbors.length; w < len4; w++) {
              neighborCoord = neighbors[w];
              if (world.cells.has(neighborCoord)) {
                //found at least 1 common neighbor.
                // ignore it if it is one of the old cells
                continue;
              }
              //OK, this neighbor referes to the previously empty place.
              // is it present in the rich map?
              richNeighborCell = connections.get(neighborCoord);
              if (richNeighborCell == null) {
                //when it is not registered yet, then do it
                richNeighborCell = new ConnectedCell(neighborCoord, 0);
                connections.put(neighborCoord, richNeighborCell);
                //and add its parents as neighbors, without checking.
                richNeighborCell.neighbors.push(richCell);
                richNeighborCell.neighbors.push(richCell2);
                richCell.neighbors.push(richNeighborCell);
                richCell2.neighbors.push(richNeighborCell);
              } else {
                //so, maybe this neighbor was already obtained as a neighbor of some other cells
                // in this case, register neighbors with a care
                if (richNeighborCell.addNeighborIfNotYet(richCell)) {
                  richCell.neighbors.push(richNeighborCell);
                }
                if (richNeighborCell.addNeighborIfNotYet(richCell2)) {
                  richCell2.neighbors.push(richNeighborCell);
                }
              }
            }
          }
        }
      }
    }
    //done processing neighbors
    //done cycle over previous cells
    previous.push(richCell);
  });
  //Done. Now return connections map
  return connections;
};


//Evaluate one step of the world, using given rule
exports.step = function(world, rule) {
  var connections, oldCells;
  connections = calculateConnections(world);
  oldCells = world.cells;
  world.cells = newCoordHash();
  world.connections = connections;
  rule.begin();
  connections.iter(function(kv) {
    var newState, state, sum;
    sum = kv.v.sum(rule);
    state = kv.v.value;
    newState = rule.next(state, sum);
    if (newState !== 0) {
      world.cells.put(kv.k, newState);
    }
  });
  //store new value in the new state too, in order to simplify neighbor calculation
  //kv.v.value = newState
  rule.end();
  return oldCells;
};


},{"./bigmath.coffee":2,"./bigmatrix.coffee":3,"./mathutil.coffee":7,"./matrix2.coffee":8,"./world.coffee":11,"big-integer":1}],5:[function(require,module,exports){
var M, findMin, intersectPolygonWithHorizontalLine, intersectSegmentWithHorizontalLine;

M = require("./matrix2.coffee");

//find minimum by key
findMin = function(arr, keyfunc) {
  var ai, besta, besti, bestkey, i, j, k, ref;
  besta = arr[0];
  bestkey = keyfunc(besta);
  besti = 0;
  for (i = j = 1, ref = arr.length; (1 <= ref ? j < ref : j > ref); i = 1 <= ref ? ++j : --j) {
    ai = arr[i];
    k = keyfunc(ai);
    if (k < bestkey) {
      bestkey = k;
      besta = ai;
      besti = i;
    }
  }
  return [besta, besti];
};

//intersection os segment, given by 2 points, with a horizontal line
// eq1: y1*(1-t)+y2*t =y;
// eq2: x1*(1-t)+x2*t =x;
// display2d: false;
// solve([eq1,eq2],[t,x]);

// returns 2 values:
//  - has intersection?
//  - intersection x coordinate
//  - y2 < y1  (if true, point is left bound, otherwise - right)
intersectSegmentWithHorizontalLine = function(v1, v2, y) {
  var dy, t, x, x1, x2, y1, y2;
  [x1, y1] = v1;
  [x2, y2] = v2;
  dy = y2 - y1;
  if (dy === 0) {
    return [false, null, null];
  }
  t = (y - y1) / dy;
  if (t < 0 || t > 1) {
    return [false, null, null];
  } else {
    x = x1 * (1 - t) + x2 * t;
    return [true, x, y2 < y1];
  }
};

//intersection of CCV polygon with H-line.
// returns flag and 3 points: left and right. 
intersectPolygonWithHorizontalLine = function(vs, y) {
  var hasLeft, hasRight, i, j, left, ref, right, tryEdge;
  hasLeft = false;
  hasRight = false;
  left = null;
  right = null;
  tryEdge = function(v1, v2) {
    var intersected, isLeft, x;
    [intersected, x, isLeft] = intersectSegmentWithHorizontalLine(v1, v2, y);
    if (intersected) {
      if (isLeft) {
        left = hasLeft ? Math.max(left, x) : x;
        return hasLeft = true;
      } else {
        right = hasRight ? Math.min(right, x) : x;
        return hasRight = true;
      }
    }
  };
  for (i = j = 0, ref = vs.length; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
    tryEdge(vs[i], vs[(i + 1) % vs.length]);
  }
  if (hasLeft && hasRight) {
    if (left <= right) {
      return [true, left, right];
    } else {
      //allow both CW and CCW
      return [true, right, left];
    }
  } else {
    return [false, null, null];
  }
};

exports.convexQuadPoints = function(vertices, callback) {
  var ibottom, intersected, itop, j, ref, ref1, results, vbottom, vtop, x, xmax, xmin, y;
  //integer points inside convex quadrilateral, given by 4 vertices
  // vertice coordinates can be non-integer.
  if (vertices.length !== 4) {
    throw new Error("Must have 4 vertices");
  }
  [vtop, itop] = findMin(vertices, function([_, y]) {
    return -y;
  });
  [vbottom, ibottom] = findMin(vertices, function([_, y]) {
    return y;
  });
  if (itop === ibottom) {
    return;
  }
//for each edge, determine whether it is left-slope or right-slope
//strictly horizontal ones can be ignored
//empty quadrilateral
  results = [];
  for (y = j = ref = Math.ceil(vbottom[1]) | 0, ref1 = Math.floor(vtop[1]) | 0; j <= ref1; y = j += 1) {
    [intersected, xmin, xmax] = intersectPolygonWithHorizontalLine(vertices, y);
    if (!intersected) {
      continue;
    }
    results.push((function() {
      var l, ref2, ref3, results1;
      results1 = [];
      for (x = l = ref2 = Math.ceil(xmin) | 0, ref3 = Math.floor(xmax) | 0; l <= ref3; x = l += 1) {
        results1.push(callback(x, y));
      }
      return results1;
    })());
  }
  return results;
};


},{"./matrix2.coffee":8}],6:[function(require,module,exports){
//Hash map that uses chain as key
var CustomHashMap, HashPair;

HashPair = class HashPair {
  constructor(k, v) {
    this.k = k;
    this.v = v;
  }

  map(mapfunc) {
    return new HashPair(this.k, mapfunc(this.v));
  }

};

exports.CustomHashMap = CustomHashMap = class CustomHashMap {
  constructor(hashfunc, equal) {
    this.hashfunc = hashfunc;
    this.equal = equal;
    this.map = {};
    this._size = 0;
  }

  put(key, value) {
    var h, pair, vals;
    h = this.hashfunc(key).toString(16);
    if (this.map.hasOwnProperty(h)) {
      vals = this.map[h];
      pair = this._findPair(vals, key);
      if (pair === null) {
        vals.push(new HashPair(key, value));
        this._size += 1;
      } else {
        pair.v = value;
      }
    } else {
      this.map[h] = [new HashPair(key, value)];
      this._size += 1;
    }
    return this;
  }

  has(key) {
    var h;
    h = this.hashfunc(key).toString(16);
    if (this.map.hasOwnProperty(h)) {
      return this._findPair(this.map[h], key) !== null;
    } else {
      return false;
    }
  }

  get(key, defval) {
    var h, pair;
    h = this.hashfunc(key).toString(16);
    if (this.map.hasOwnProperty(h)) {
      pair = this._findPair(this.map[h], key);
      if (pair === null) {
        return defval;
      } else {
        return pair.v;
      }
    } else {
      return defval;
    }
  }

  remove(key) {
    var h, i, vals;
    h = this.hashfunc(key).toString(16);
    if (this.map.hasOwnProperty(h)) {
      vals = this.map[h];
      i = this._findPairIndex(vals, key);
      if (i === -1) {
        return false;
      } else {
        vals.splice(i, 1);
        this._size -= 1;
        return true;
      }
    } else {
      return false;
    }
  }

  _findPair(values, key) {
    var j, len, pair;
    for (j = 0, len = values.length; j < len; j++) {
      pair = values[j];
      if ((pair.k === key) || this.equal(pair.k, key)) {
        return pair;
      }
    }
    return null;
  }

  _findPairIndex(values, key) {
    var i, j, len, pair;
    for (i = j = 0, len = values.length; j < len; i = ++j) {
      pair = values[i];
      if ((pair.k === key) || this.equal(pair.k, key)) {
        return i;
      }
    }
    return -1;
  }

  size() {
    return this._size;
  }

  iter(cb) {
    var _, j, len, pair, pairs, ref;
    ref = this.map;
    for (_ in ref) {
      pairs = ref[_];
      for (j = 0, len = pairs.length; j < len; j++) {
        pair = pairs[j];
        cb(pair);
      }
    }
  }

  mapValues(mapfunc) {
    var hash, kv, mapped, pairs, ref;
    mapped = new CustomHashMap(this.hashfunc, this.equal);
    ref = this.map;
    for (hash in ref) {
      pairs = ref[hash];
      mapped.map[hash] = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = pairs.length; j < len; j++) {
          kv = pairs[j];
          results.push(kv.map(mapfunc));
        }
        return results;
      })();
    }
    return mapped;
  }

  equal(that, compareValues = function(x, y) {
      return x === y;
    }) {
    var _, j, len, otherValue, pair, pairs, ref;
    if (this.size() !== that.size()) {
      return false;
    }
    ref = this.map;
    for (_ in ref) {
      pairs = ref[_];
      for (j = 0, len = pairs.length; j < len; j++) {
        pair = pairs[j];
        otherValue = that.get(kv.k);
        if (!((otherValue != null) && (compareValues(kv.v, otherValue)))) {
          return false;
        }
      }
    }
    return true;
  }

};


},{}],7:[function(require,module,exports){
"use strict";
var M;

M = require("./matrix2.coffee"); 

/*calculate quadratic cofrm
*/
exports.qform = function([a, b, c, d], [x, y]) {
  return x * x * a + (b + c) * x * y + y * y * d;
};

/*Convert identity transofrm to quadratic form matrix
*/
exports.tfm2qform = function([a, b, c, d]) {
  return [2 * c, d - a, d - a, -2 * b];
};


},{"./matrix2.coffee":8}],8:[function(require,module,exports){
"use strict";
var add, addScaledInplace, adjoint, amplitude, approxEq, approxEqv, copy, det, diag, eig, eigvReal, eivgRealOne, equal, eye, fromColumns, hrot, hrot_, inv, len2, mul, mulv, normalized, rot, set, smul, toColumns, tr, transpose, zero;

//Operations on 2x2 matrices
// Matrices stored as arrays, row by row
exports.eye = eye = function() {
  return [1.0, 0.0, 0.0, 1.0];
};

exports.diag = diag = function(a, b) {
  return [a, 0.0, 0.0, b];
};

exports.zero = zero = function() {
  return [0.0, 0.0, 0.0, 0.0];
};

exports.set = set = function(m, i, j, v) {
  m[i * 2 + j] = v;
  return m;
};

exports.rot = rot = function(angle) {
  var c, m, s;
  m = eye();
  s = Math.sin(angle);
  c = Math.cos(angle);
  return [c, -s, s, c];
};

exports.hrot_ = hrot_ = function(sinhD) {
  var c, m, s;
  m = eye();
  s = sinhD;
  c = Math.sqrt(sinhD * sinhD + 1);
  return [c, s, s, c];
};

exports.hrot = hrot = function(angle) {
  var c, e, ie, s;
  e = Math.exp(angle);
  ie = 1.0 / e;
  s = (e - ie) * 0.5;
  c = (e + ie) * 0.5;
  return [c, s, s, c];
};

exports.mul = mul = function(m1, m2) {
  var i, j, k, l, m, o, p, s;
  m = zero();
  for (i = l = 0; l < 2; i = ++l) {
    for (j = o = 0; o < 2; j = ++o) {
      s = 0.0;
      for (k = p = 0; p < 2; k = ++p) {
        s += m1[i * 2 + k] * m2[k * 2 + j];
      }
      m[i * 2 + j] = s;
    }
  }
  return m;
};

exports.approxEq = approxEq = function(m1, m2, eps = 1e-6) {
  var d, i, l, ref;
  d = 0.0;
  for (i = l = 0, ref = m1.length; (0 <= ref ? l < ref : l > ref); i = 0 <= ref ? ++l : --l) {
    d += Math.abs(m1[i] - m2[i]);
  }
  return d < eps;
};

exports.copy = copy = function(m) {
  return m.slice(0);
};

exports.mulv = mulv = function(m, v) {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
};

exports.approxEqv = approxEqv = function(v1, v2, eps = 1e-6) {
  var d, i, l;
  d = 0.0;
  for (i = l = 0; l < 2; i = ++l) {
    d += Math.abs(v1[i] - v2[i]);
  }
  return d < eps;
};

/*
 * m: matrix( [m0, m1, m2], [m3,m4,m5], [m6,m7,m8] );
 * ratsimp(invert(m)*determinant(m));
 * determinant(
 */
exports.inv = inv = function(m) {
  var iD;
  //Calculated with maxima
  iD = 1.0 / det(m);
  return smul(iD, adjoint(m));
};

exports.adjoint = adjoint = function(m) {
  return [m[3], -m[1], -m[2], m[0]];
};

exports.smul = smul = function(k, m) {
  var l, len, mi, results;
  results = [];
  for (l = 0, len = m.length; l < len; l++) {
    mi = m[l];
    results.push(mi * k);
  }
  return results;
};

exports.add = add = function(m1, m2) {
  var i, l, results;
  results = [];
  for (i = l = 0; l < 4; i = ++l) {
    results.push(m1[i] + m2[i]);
  }
  return results;
};

exports.addScaledInplace = addScaledInplace = function(m, m1, k) {
  var i, l, ref;
  for (i = l = 0, ref = m.length; (0 <= ref ? l < ref : l > ref); i = 0 <= ref ? ++l : --l) {
    m[i] += m1[i] * k;
  }
  return m;
};

exports.transpose = transpose = function(m) {
  return [m[0], m[2], m[1], m[3]];
};

exports.amplitude = amplitude = function(m) {
  var mi;
  return Math.max(...((function() {
    var l, len, results;
    results = [];
    for (l = 0, len = m.length; l < len; l++) {
      mi = m[l];
      results.push(Math.abs(mi));
    }
    return results;
  })()));
};

/*  array of matrix powers, from 0th to (n-1)th
*/
exports.powers = function(matrix, n) {
  var i, l, m_n, pows, ref;
  //current power
  m_n = eye();
  pows = [m_n];
  for (i = l = 1, ref = n; (1 <= ref ? l < ref : l > ref); i = 1 <= ref ? ++l : --l) {
    m_n = mul(matrix, m_n);
    pows.push(m_n);
  }
  return pows;
};

exports.eig = eig = function(m) {
  var D, a, b, bb, c, cc, d, q;
  //returns 3 values
  // (true, e1, e2)
  // (false, re(e), im(e)
  [a, b, c, d] = m;
  // pp - (a+d)p + ad-bc
  bb = a + d;
  cc = det(m);
  D = 0.25 * bb ** 2 - cc;
  if (D < 0) {
    return [false, 0.5 * bb, Math.sqrt(-D)];
  } else {
    q = Math.sqrt(D);
    return [true, 0.5 * bb - q, 0.5 * bb + q];
  }
};

/* Calcualte eigenvectors
*/
exports.det = det = function(m) {
  var a, b, c, d;
  [a, b, c, d] = m;
  return a * d - b * c;
};

eivgRealOne = function(m, lam) {
  var a, b, c, d, m1;
  m1 = m.slice(0);
  addScaledInplace(m1, eye(), -lam);
  [a, b, c, d] = m1;
  if (b ** 2 + a ** 2 > d ** 2 + c ** 2) {
    return [b, -a];
  } else {
    return [d, -c];
  }
};

exports.eigvReal = eigvReal = function(m, lam1, lam2) {
  return [eivgRealOne(m, lam1), eivgRealOne(m, lam2)];
};

exports.fromColumns = fromColumns = function([a, b], [c, d]) {
  return [a, c, b, d];
};

exports.toColumns = toColumns = function([a, c, b, d]) {
  return [[a, b], [c, d]];
};

//Given symmetrix matrix S return new matrix such that
// v' s v = diag(+-1)
exports.orthoDecomp = function(s) {
  var d1, d2, isReal, sigma1, sigma2, v, v1, v2;
  [isReal, sigma1, sigma2] = eig(s);
  if (Math.abs(sigma1 - sigma2) > 1e-6) {
    [v1, v2] = eigvReal(s, sigma1, sigma2);
    v = fromColumns(normalized(v1), normalized(v2));
  } else {
    v = eye();
  }
  d1 = 1.0 / Math.sqrt(Math.abs(sigma1));
  d2 = 1.0 / Math.sqrt(Math.abs(sigma2));
  return mul(v, diag(d1, d2));
};

exports.len2 = len2 = function([x, y]) {
  return x ** 2 + y ** 2;
};

exports.normalized = normalized = function(v) {
  return smul(1.0 / Math.sqrt(len2(v)), v);
};

exports.dot = function([x1, y1], [x2, y2]) {
  return x1 * x2 + y1 * y2;
};

exports.vcombine = function([x1, y1], k, [x2, y2]) {
  return [x1 + k * x2, y1 + k * y2];
};

exports.equal = equal = function(u, v) {
  var i, l, len, ui;
  for (i = l = 0, len = u.length; l < len; i = ++l) {
    ui = u[i];
    if (ui !== v[i]) {
      return false;
    }
  }
  return true;
};

exports.tr = tr = function(m) {
  return m[0] + m[3];
};


},{}],9:[function(require,module,exports){
"use strict";
var BinaryTotalisticRule, CustomRule;

/* cellular automaton rule
*/
exports.BinaryTotalisticRule = BinaryTotalisticRule = (function() {
  class BinaryTotalisticRule {
    constructor(rulestr) {
      var m, parseTable;
      this.tables = [{}, {}];
      m = /B([0-9\(\)]*)\/?S([0-9\(\)]*)/i.exec(rulestr.trim());
      if (m == null) {
        throw new Error(`Bad rule string: ${rulestr}`);
      }
      parseTable = function(tableStr) {
        var i, key, len, part, ref, ref1, table;
        table = {};
        ref1 = (ref = tableStr.match(/\d|\(\d+\)/g)) != null ? ref : [];
        for (i = 0, len = ref1.length; i < len; i++) {
          part = ref1[i];
          if (part[0] === "(") {
            part = part.substring(1, part.length - 1);
          }
          key = parseInt(part, 10);
          if (key !== key) {
            throw new Error(`Bad neighbor sum ${part}`);
          }
          table[key] = 1;
        }
        return table;
      };
      this.tables[0] = parseTable(m[1]);
      this.tables[1] = parseTable(m[2]);
    }

    next(state, sumNeighbors) {
      var ref;
      return (ref = this.tables[state][sumNeighbors]) != null ? ref : 0;
    }

    fold(prev, neighborValue) {
      return prev + neighborValue;
    }

    toString() {
      var tablekeys;
      tablekeys = function(table) {
        var _, i, k, key, keys, len, results;
        keys = (function() {
          var results;
          results = [];
          for (key in table) {
            _ = table[key];
            results.push(parseInt(key, 10));
          }
          return results;
        })();
        keys.sort(function(a, b) {
          return a - b;
        });
        results = [];
        for (i = 0, len = keys.length; i < len; i++) {
          k = keys[i];
          if (k < 10) {
            results.push("" + k);
          } else {
            results.push("(" + k + ")");
          }
        }
        return results;
      };
      return `B${tablekeys(this.tables[0]).join('')}/S${tablekeys(this.tables[1]).join('')}`;
    }

    begin() {}

    end() {}

  };

  BinaryTotalisticRule.prototype.states = 2;

  //totalistic folding
  BinaryTotalisticRule.prototype.foldInitial = 0;

  return BinaryTotalisticRule;

}).call(this);

exports.CustomRule = CustomRule = (function() {
  var _Class;

  _Class = class {
    constructor(code) {
      var codeobj, err, field, value;
      this.code = code;
      try {
        codeobj = eval('(' + this.code + ')');
      } catch (error) {
        err = error;
        throw new Error(`Bad syntax in rule code: ${err}`);
      }
      if (codeobj.next == null) {
        throw new Error("State evaluation function 'next' not defined");
      }
//put cudeobj method to self
      for (field in codeobj) {
        value = codeobj[field];
        if (codeobj.hasOwnProperty(field)) {
          this[field] = value;
        }
      }
    }

    fold(prev, neighborValue) {
      return prev + neighborValue;
    }

    toString() {
      return this.code;
    }

    //Callbacks for user support
    begin() {}

    end() {}

  };

  
  //totalistic folding. could be overloaded by rule
  _Class.prototype.foldInitial = 0;

  return _Class;

}).call(this);


},{}],10:[function(require,module,exports){
"use strict";
var BinaryTotalisticRule, CA, CustomRule, M, World, bigInt, cellList2Text, convexQuadPoints, makeCoord, onmessage, parseCellList, parseCellListBig, qform, renderDataImpl, sortCellList, tfm2qform;

M = require("./matrix2.coffee");

({convexQuadPoints} = require("./geometry.coffee"));

({qform, tfm2qform} = require("./mathutil.coffee"));

({World, makeCoord, cellList2Text, sortCellList, parseCellList, parseCellListBig} = require("./world.coffee"));

CA = require("./ca.coffee");

({BinaryTotalisticRule, CustomRule} = require("./rule.coffee"));

bigInt = require("big-integer");

onmessage = function(e) {
  var data, msg;
  [msg, data] = e.data;
  return postMessage((function() {
    try {
      switch (false) {
        case msg !== "render":
          return renderDataImpl(...data);
        default:
          throw new Error(`unknown message ${msg}`);
      }
    } catch (error) {
      e = error;
      return ['error', "" + e];
    }
  })());
};

renderDataImpl = function(ruleType, ruleCode, skewMatrix, neighbors, cells, needConnections) {
  var connections, i, len, rule, s, t0, t1, world, x, y;
  //first convert everything to the native objects
  rule = (function() {
    switch (false) {
      case ruleType !== "BinaryTotalisticRule":
        return new BinaryTotalisticRule(ruleCode);
      case ruleType !== "CustomRule":
        return new CustomRule(ruleCode);
      default:
        throw new Error(`Bad rule type ${ruleType}`);
    }
  })();
  world = new World(skewMatrix, []);
  world.setNeighborDistances(neighbors);
  for (i = 0, len = cells.length; i < len; i++) {
    [x, y, s] = cells[i];
    world.setCell(makeCoord(x, y), s);
  }
  t0 = performance.now();
  CA.step(world, rule);
  t1 = performance.now();
  console.log(`Step time is ${t1 - t0}ms`);
  cells = [];
  world.cells.iter(function(kv) {
    return cells.push(["" + kv.k.x, "" + kv.k.y, kv.v]);
  });
  if (!needConnections) {
    return [
      'OK',
      {
        'cells': cells
      }
    ];
  } else {
    connections = [];
    world.connections.iter(function(kv) {
      var neighborCell;
      neighbors = (function() {
        var j, len1, ref, results;
        ref = kv.v.neighbors;
        results = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          neighborCell = ref[j];
          results.push(["" + neighborCell.coord.x, "" + neighborCell.coord.y]);
        }
        return results;
      })();
      connections.push(["" + kv.k.x, "" + kv.k.y, kv.v.value, neighbors]);
    });
    return [
      'OK',
      {
        'cells': cells,
        'connections': connections
      }
    ];
  }
};

self.addEventListener('message', onmessage, false);

console.log("Worker started 1");


},{"./ca.coffee":4,"./geometry.coffee":5,"./mathutil.coffee":7,"./matrix2.coffee":8,"./rule.coffee":9,"./world.coffee":11,"big-integer":1}],11:[function(require,module,exports){
"use strict";
var B, Coord, CustomHashMap, M, World, _parseCellListImpl, bigInt, bigIntHash, calculateLattice, hashCombine, muls, newCoordHash, qform, rot45, tfm2qform;

bigInt = require("big-integer");

({bigIntHash} = require("./bigmath.coffee"));

({CustomHashMap} = require("./hashmap.coffee"));

({qform, tfm2qform} = require("./mathutil.coffee"));

M = require("./matrix2.coffee");

B = require("./bigmatrix.coffee");

hashCombine = function(h1, h2) {
  return (((h1 << 5) - h1) + h2) | 0;
};

muls = function(...mtxs) {
  var j, len, m, mi, ref;
  m = mtxs[0];
  ref = mtxs.slice(1);
  for (j = 0, len = ref.length; j < len; j++) {
    mi = ref[j];
    m = M.mul(m, mi);
  }
  return m;
};

exports.Coord = Coord = class Coord {
  constructor(x1, y1) {
    this.x = x1;
    this.y = y1;
    this.hash = hashCombine(bigIntHash(this.x), bigIntHash(this.y));
  }

  toString() {
    return `(${this.x},${this.y})`;
  }

  equals(that) {
    return (this.hash === that.hash) && (this.x.equals(that.x)) && (this.y.equals(that.y));
  }

  translate([dx, dy]) {
    return new Coord(this.x.add(dx), this.y.add(dy));
  }

  translateBack([dx, dy]) {
    return new Coord(this.x.subtract(dx), this.y.subtract(dy));
  }

  //vector from this to that
  offset(that) {
    return [that.x.subtract(this.x), that.y.subtract(this.y)];
  }

};

exports.makeCoord = function(x, y) {
  return new Coord(bigInt(x), bigInt(y));
};

rot45 = M.rot(Math.PI * -0.25);

exports.newCoordHash = newCoordHash = function() {
  return new CustomHashMap((function(c) {
    return c.hash;
  }), (function(c1, c2) {
    return c1.equals(c2);
  }));
};

//for the given integer transformation matrix, returns primitive vectors of the lattice, implementing it.
// vectors are columns
calculateLattice = function([x, y, z, w]) {
  var angle, i2z, isEuclidean, q, s;
  i2z = 0.5 / z;
  s = x + w;
  q = Math.sqrt(Math.abs(s * s - 4.0));
  isEuclidean = Math.abs(s) < 2;
  return angle = {
    T: [1.0, (w - x) * i2z, 0.0, q * i2z],
    euclidean: isEuclidean,
    angle: isEuclidean ? Math.atan2(q, s) : Math.log((q + s) * 0.5)
  };
};

exports.World = World = class World {
  constructor(skewMatrix, neighborVectors) {
    var T, flip, tr, vv;
    this.cells = newCoordHash();
    this.connections = null;
    this.m = skewMatrix;
    if (M.det(this.m) !== 1) {
      //;paing matrix details
      throw new Error("matrix determinant is not 1");
    }
    
    //calculate various lattice parameters
    this.m_inv = M.adjoint(this.m); //inverse skew matrix (adjoint is fine because det=1)
    this.a = tfm2qform(this.m); //conic (pseudonorm) matrix.
    this.setNeighborVectors(neighborVectors); //pseudonorm of the neighbor vector
    tr = M.tr(this.m);
    if (Math.abs(tr) === 2) {
      throw new Error("Degenerate case |tr(M)|=2 is not supported");
    }
    if (M.tr(this.m) < -2) {
      throw new Error("Pseudo-rotation matrix must have positive trace");
    }
    ({
      //parameters of the invariant (pseudo)rotation.

      //Normalized projection of the lattice.
      T: T,
      euclidean: this.isEuclidean,
      angle: this.angle
    } = calculateLattice(this.m));
    vv = M.inv(T);
    //ensure the order of vectors in the lattice matrix so that invariant rotation angle would always be positive
    if (this.angle < 0) {
      this.angle = -this.angle;
      // rearrange order of columns and rows in r: 
      // r1 = flip * r * flip  where flip = [0 1 1 0]
      // thus vv1 = vv * flip
      flip = this.isEuclidean ? [0, 1, 1, 0] : [0, 1, -1, 0];
      vv = M.mul(vv, flip);
    }
    this.latticeMatrix = vv;
  }

  setNeighborDistances(neighborDistances) {
    return this.c = neighborDistances;
  }

  setNeighborVectors(neighborVectors) {
    var x0;
    return this.c = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = neighborVectors.length; j < len; j++) {
        x0 = neighborVectors[j];
        results.push(qform(this.a, x0));
      }
      return results;
    }).call(this);
  }

  setCell(coord, state) {
    if (state === 0) {
      this.cells.remove(coord);
    } else {
      this.cells.put(coord, state);
    }
  }

  putPattern(coord, celllist) {
    var j, len, xys;
    for (j = 0, len = celllist.length; j < len; j++) {
      xys = celllist[j];
      this.setCell(coord.translate(xys), xys[2]);
    }
  }

  //convenience toggle method.
  toggle(coord, state = 1) {
    var old;
    old = this.cells.get(coord, 0);
    if (old !== state) {
      return this.cells.put(coord, state);
    } else {
      if (old !== 0) {
        return this.cells.remove(coord);
      }
    }
  }

  getCell(coord) {
    return this.cells.get(coord, 0);
  }

  //vector pseudonorm
  pnorm2(bigVec) {
    return B.qformSmallA(this.a, bigVec);
  }

  
    //pseudo-distance between 2 coordinates
  pdist2(coord1, coord2) {
    return this.pnorm2(coord1.offset(coord2));
  }

  clear() {
    this.cells = newCoordHash();
    this.connections = null;
    return this;
  }

  population() {
    return this.cells.size();
  }

  getCellList() {
    var cl;
    cl = [];
    this.cells.iter(function(kv) {
      return cl.push([kv.k.x, kv.k.y, kv.v]);
    });
    return cl;
  }

};

exports.cellList2Text = function(cells) {
  var s, x, y;
  return ((function() {
    var j, len, results;
    results = [];
    for (j = 0, len = cells.length; j < len; j++) {
      [x, y, s] = cells[j];
      results.push(`${x} ${y} ${s}`);
    }
    return results;
  })()).join(";");
};

exports.sortCellList = function(cells) {
  cells.sort(function(vals1, vals2) {
    var cmp, i, j, len, v1, v2;
    for (i = j = 0, len = vals1.length; j < len; i = ++j) {
      v1 = vals1[i];
      v2 = vals2[i];
      cmp = v1.compare(v2);
      if (cmp !== 0) {
        return cmp;
      }
    }
    return 0;
  });
  return cells;
};

exports.centerCellList = function(cells) {
  var _, cx, cy, i, j, k, len, len1, results, s, sx, sy, x, y;
  if (cells.length === 0) {
    return cells;
  }
  for (i = j = 0, len = cells.length; j < len; i = ++j) {
    [x, y, _] = cells[i];
    if (i === 0) {
      sx = x;
      sy = y;
    } else {
      sx = sx.add(x);
      sy = sy.add(y);
    }
  }
  cx = sx.divide(cells.length);
  cy = sy.divide(cells.length);
//console.log "CEnter #{cx}, #{cy}"
  results = [];
  for (k = 0, len1 = cells.length; k < len1; k++) {
    [x, y, s] = cells[k];
    results.push([x.subtract(cx), y.subtract(cy), s]);
  }
  return results;
};

exports.parseCellList = function(text) {
  return _parseCellListImpl(text, function(s) {
    return parseInt(s, 10);
  });
};

exports.parseCellListBig = function(text) {
  return _parseCellListImpl(text, bigInt);
};

_parseCellListImpl = function(text, intParser) {
  var j, len, m, part, ref, results, s, x, y;
  console.log(text);
  ref = text.split(";");
  results = [];
  for (j = 0, len = ref.length; j < len; j++) {
    part = ref[j];
    if (!(part)) {
      continue;
    }
    m = /(-?\d+)\s+(-?\d+)\s+(\d+)/.exec(part.trim());
    if (m === null) {
      throw new Error(`Bad format of cell list: ${part}`);
    }
    x = intParser(m[1]);
    y = intParser(m[2]);
    s = parseInt(m[3], 10);
    results.push([x, y, s]);
  }
  return results;
};


},{"./bigmath.coffee":2,"./bigmatrix.coffee":3,"./hashmap.coffee":6,"./mathutil.coffee":7,"./matrix2.coffee":8,"big-integer":1}]},{},[10]);
