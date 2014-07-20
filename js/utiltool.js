/*
 AlpineBits rate plan message test application
 Copyright (C) 2014 TIS innovation park - Free Software & Open Technologies - IT1677580217
 
 https://tis.bz.it/en/centres/free-software-open-technologies
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/********************************************************************************************************************** 
 * utiltool.js: a module of simple toolkit functions
 **********************************************************************************************************************/

'use strict';

function utiltool_install(exp) {

	exp.uniq = function(a) {
		var i, j, b = [], seen;
		for (i = 0; i < a.length; i++) {
			seen = false;
			for (j = 0; j < b.length; j++) {
				if (a[i] === b[j]) {
					seen = true;
					break;
				}
			}
			if (!seen) {
				b.push(a[i]);
			}
		}
		return b;

	};

	exp.remove_min = function(ar) {
		var minval = null, minix = null;
		var i;
		if (!(ar instanceof Array)) {
			return ar;
		}
		if (ar.length === 0) {
			return ar;
		}
		for (i = 0; i < ar.length; i++) {
			if (minval === null || ar[i] < minval) {
				minval = ar[i];
				minix = i;
			}
		}
		if (minix === null) {
			return ar;
		}
		var ar2 = [];
		for (i = 0; i < ar.length; i++) {
			if (i !== minix) {
				ar2.push(ar[i]);
			}
		}
		return ar2;
	};


	exp.repeat = function(str, n) {
		var buf = '';
		var i;
		for (i = 0; i < n; i++) {
			buf += String(str);
		}
		return buf;
	};


	exp.is_positive_int = function(a) {

		var s = String(a);
		var p = s.match(/^\d+$/);
		if (!p) {
			return false;
		}
		var n = Number(a);
		if (n === 0) {
			return false;
		}
		return true;
	};


	exp.plural = function(noun, num) {
		if (num === 1) {
			return '1 ' + noun;
		}
		if (noun === "child") {
			return num + ' children';
		}
		return num + ' ' + noun + 's';
	};


}
;

