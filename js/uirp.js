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
 * uirp.js: user interface for the rate plan message files section
***********************************************************************************************************************/

'use strict';


/* 
 * the global variable rpmsg holds the loaded and parsed rate plan message files
 * 
 * example:
 *
 *   { cnt_should_be_loaded: 2,
 *               cnt_loaded: 2,
 *                    items: [
 *                             {    name: 'good_file.xml',
 *                                 state:  uirp_GOOD,
 *                               content: 'xml contents...',
 *                                   doc: 'XMLDocument object...'
 *                             },
 *                             {    name: 'bad_file.xml',
 *                                 state:  uirp_BAD,
 *                               content: 'xml contents...',
 *                               err_msg: 'not well-formed, wrong default namespace or not an OTA_HotelRatePlanNotifRQ document',
 *                             }
 *                           ]
 *   }
 * 
 */
var rpmsg = null;


/*
 * constant for the state property of rpmsg.items
 */
var uirp_BAD = 0;
var uirp_PENDING_LOAD = 1;
var uirp_PENDING_CHECK = 2;
var uirp_GOOD = 3;


/*
 * count the number of GOOD rate plan message files
 */
function uirp_count_good_rpmsg() {
    var i, c;
    if (!rpmsg) {
        return 0;
    }
    c = 0;
    for (i = 0; i < rpmsg.items.length; i++) {
        if (rpmsg.items[i].state === uirp_GOOD) {
            c++;
        }
    }
    return c;
}


/* 
 * handle the event triggered when rate plan message files are dragged
 * and dropped into the #dropzone div
 */
function uirp_drop_handler(e) {

    // hey, files were dropped into our app!

    var i, f, fr;
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files;

    var dz = document.getElementById('dropzone');

    // first pass: find out how many of the dropped files were
    // non-empty XML files (and so should be loaded at all)

    var usable_cnt = 0;
    for (i = 0; i < files.length; i++) {
        f = files[i];
        if (f.type === 'text/xml' && f.size > 0) {
            usable_cnt++;
        }
    }
    if (usable_cnt === 0) {
        dz.innerHTML = 'please drop <b style="color: red">non-empty XML files</b> here';
        return;
    }

    // second pass: start loading files

    rpmsg = {
        cnt_should_be_loaded: usable_cnt,
        cnt_loaded: 0,
        items: new Array()
    };

    for (i = 0; i < files.length; i++) {
        f = files[i];
        if (f.type !== 'text/xml') {
            rpmsg.items.push({name: f.name, state: uirp_BAD, err_msg: 'not an XML file'});
            continue;
        }
        if (f.size <= 0) {
            rpmsg.items.push({name: f.name, state: uirp_BAD, err_msg: 'empty file'});
            continue;
        }
        rpmsg.items.push({name: f.name, state: uirp_PENDING_LOAD});
        fr = new FileReader();
        fr.readAsText(files[i]);
        
        // loading is asynchronous, so we're generating anonymous callbacks here
        
        fr.onload = (function(num, freader) {
            return function() {
                rpmsg.items[num].content = freader.result;
                rpmsg.items[num].state = uirp_PENDING_CHECK;
                rpmsg.cnt_loaded++;
                if (rpmsg.cnt_loaded === rpmsg.cnt_should_be_loaded) {
                    uirp_drop_ready();
                }
            };
        })(i, fr);
        
    }

}


/* 
 * handle the event triggered while dragging the rate plan message files over
 * the #dropzone div (preventing the default action)
 */
function uirp_drop_dragover_handler(e) {
    e.preventDefault();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.dropEffect = 'copy';
    return false;
}


/* 
 * called after all dropped files are loaded:
 *  - check well-formedness of the content (XML) of rate plan message files that are in PENDING_CHECK
 *  - display table of files with stats in the #rptab div
 */
function uirp_drop_ready() {

    var i, s, rp;

    // hide the #dropzone div
    
    var dz = document.getElementById('dropzone');
    dz.style["display"] = "none";

    // check files in state PENDING_CHECK by dom-parsing the XML and store the DOM 

    for (i = 0; i < rpmsg.items.length; i++) {
        rp = rpmsg.items[i];
        if (rp.state === uirp_PENDING_CHECK) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(rp.content, 'application/xml');
            // a non-well formed document will give an error document here,
            // we trace this by verifying the document element name
            var check = dom_get_xnode(doc, '/x:OTA_HotelRatePlanNotifRQ');
            if (check && check.nodeName === 'OTA_HotelRatePlanNotifRQ') {
                rp.state = uirp_GOOD;
                rp.doc = doc;
            } else {
                rp.state = uirp_BAD;
                rp.err_msg = "not well-formed, wrong default namespace or not an OTA_HotelRatePlanNotifRQ document";
            }
        }
    }

    // generate table and display the #rptab and #rptab_reset divs

    var out = s = '';

    s = util.td('name', 'h') + util.td('state', 'h') + util.td('hotel', 'h') + 
        util.td('rate plan codes', 'h') + util.td('inv type codes', 'h') +
        util.td('#r', 'h') + util.td('#br', 'h'); 
    out += util.tag(s, 'tr');

    for (i = 0; i < rpmsg.items.length; i++) {
        rp = rpmsg.items[i];
        s = '';
        if (rp.state !== uirp_GOOD) {
            s += util.td(rp.name, 'rptab_bad');
            s += util.td('KO (' + rp.err_msg + ')', 'rptab_badmsg', 6);
            out += util.tag(s, 'tr');
            continue;
        }
        s += util.td(rp.name, 'rptab_good');
        s += util.td('OK');
        
        // table stats, easy thanks to xpath
        
        s += util.td(dom_get_hotel(rp.doc));
        s += util.td(dom_get_xvalues(rp.doc, '//@RatePlanCode').join(', '));        
        s += util.td(util.uniq(dom_get_xvalues(rp.doc, '//@InvTypeCode')).join(', '));        
        s += util.td(dom_get_xnodes(rp.doc, '//x:Rate').length);
        s += util.td(dom_get_xnodes(rp.doc, '//x:BookingRule').length);
        
        out += util.tag(s, 'tr');
    }

    var div;
    div = document.getElementById('rptab');
    div.innerHTML = util.tag(out, 'table');
    div.style["display"] = "block";
    div = document.getElementById('rptab_reset');
    div.style["display"] = "block";
    
    // (re-)compute report
    
    uirs_compute_results();

}


/* 
 * reset rate plan message files
 */
function uirp_reset_rpmsg() {

    // (re)show the #dropzone div and hide the other rate plan divs

    var dz = document.getElementById('dropzone');
    dz.style["display"] = "block";
    dz.innerHTML = "please drag &amp; drop your sample files here";
    document.getElementById('rptab').style["display"] = 'none';
    document.getElementById('rptab_reset').style["display"] = 'none';

    // remove rate plan messages

    rpmsg = null;

    // (re-)compute report (will be cleared, since we don't have any more 
    // rate plans at this point)
    
    uirs_compute_results();

}




