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
 * uist.js: user interface for the stays section
***********************************************************************************************************************/

'use strict';

   
/* 
 * the global arrays stays holds the stays (as read from the rows of the textarea
 * 
 * example:
 *
 *
 *   [ {name: "couple",      arrival: "2014-03-11", departure: "2014-03-13", num_adults: "2", children: []  },
 *     {name: "family_1kid", arrival: "2014-04-11", departure: "2014-04-13", num_adults: "2", children: [0] }
 *   ]  
 *   
 */
var stays = [];
            
            
/*
 * (re-)parses the textarea rows into the stays array
 */
function uist_load() {
    var i, j;
    
    stays = [];
    var csv = document.getElementById('csv').value;
    var line_rex = /^\s*([a-zA-Z0-9_]+)\s*,\s*(\d{4}-\d{2}-\d{2})\s*,\s*(\d{4}-\d{2}-\d{2})\s*,\s*(\d{1,2})\s*([\s,0-9]*)$/; 
    var input = csv.split('\n');
    for (i = 0; i < input.length; i++) {
        if (!input[i].match(/^\s*#/)) {
            var m = input[i].match(line_rex);
            if (m) {
                // num_adults
                m[4] = Number(m[4]);
                // arrival, departure
                if (!util.is_valid_date(m[2]) || !util.is_valid_date(m[3])) {
                    continue;
                }
                if (util.date_diff(m[2], m[3]) <= 0) {
                    continue;
                }
                // age of children
                var ch = m[5].split(',');
                var chf = [];
                var bad_children = false;
                if (ch[0] !== '') {
                    bad_children = true;
                }
                for (j = 1; j < ch.length; j++) {
                    var chm = ch[j].match(/^\s*(\d{1,2})\s*$/);
                    if (chm) {
                        chf.push(Number(chm[1]));
                    } else {
                        bad_children = true;
                    }
                }
                if (bad_children) {
                    continue;
                }
                if (m[4] + chf.length === 0) { // no zero occupation
                    continue;
                }
                stays.push({
                    name: m[1],
                    arrival: m[2],
                    departure: m[3],
                    num_adults: m[4],
                    children: chf
                });

            }
        }
    }

    var p = document.getElementById('csv_summary');
    var ns = [], s = '';
    for (i = 0; i < stays.length; i++) {
        var dd = util.date_diff(stays[i].arrival, stays[i].departure);
        ns.push(util.tag(stays[i].name, 'b') + ' (' + util.plural('night', dd) + ')');
    }
    if (ns.length !== 0) {
        s = ': ' + ns.join(', ');
        p.style["color"] = '#009900';
    } else {
        p.style["color"] = '#CC0000';
    }
    p.innerHTML = util.plural('stay record', stays.length) + ' successfully parsed' + s;

    uirs_compute_results();

}

