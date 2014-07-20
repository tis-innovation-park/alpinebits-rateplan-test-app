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
 * utilhtml.js: a module of simple HTML-generating functions
 **********************************************************************************************************************/

'use strict';


function utilhtml_install(exp) {

    exp.tag = function(content, tag_name, css_class) {
        var s1 = '';
        if (css_class) {
            s1 = 'class="' + css_class + '"';
        }
        return '<' + tag_name + ' ' + s1 + '>' + content + '</' + tag_name + '>';
    };

    exp.td = function(content, css_class, col_span) {
        var s1 = '';
        if (css_class) {
            s1 = 'class="' + css_class + '"';
        }
        var s2 = '';
        if (col_span) {
            s2 = 'colspan="' + col_span + '"';
        }

        return '<td ' + s1 + ' ' + s2 + '>' + content + '</td>';
    };

}
;



