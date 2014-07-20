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
 * dom.js: helper functions to access the DOM
 **********************************************************************************************************************/

'use strict';


/**
 * get first node in doc found by given xpath
 * 
 * @param   {object XMLDocument}        doc
 * @param   {string}                    xpath
 * @returns {object Element|Attr|...}
 */
function dom_get_xnode(doc, xpath) {
    var res = doc.evaluate(xpath, doc, dom_ns_resolver, XPathResult.ANY_TYPE, null);
    if (res) {
        res = res.iterateNext();
    }
    return res;
}


/**
 * get value of first node in doc found by given xpath
 * 
 * @param   {object XMLDocument}        doc
 * @param   {string}                    xpath
 * @returns {string}
 */
function dom_get_xvalue(doc, xpath) {
    var res = doc.evaluate(xpath, doc, dom_ns_resolver, XPathResult.ANY_TYPE, null);
    if (res) {
        res = res.iterateNext();
    }
    if (res) {
        return res.value;
    } else {
        return null;
    }
}


/**
 * get Array of nodes in doc found by given xpath
 * 
 * @param   {object XMLDocument}        doc
 * @param   {string}                    xpath
 * @returns {Array of object Element|Attr|...}
 */
function dom_get_xnodes(doc, xpath) {
    var r = [];
    var res = doc.evaluate(xpath, doc, dom_ns_resolver, XPathResult.ANY_TYPE, null);
    if (res) {
        var v;
        do {
            v = res.iterateNext();
            if (v) {
                r.push(v);
            }
        } while (v);
    }
    return r;
}


/**
 * get Arrays of values of nodes in doc found by given xpath
 * 
 * @param   {object XMLDocument}        doc
 * @param   {string}                    xpath
 * @returns {Array of string}
 */
function dom_get_xvalues(doc, xpath) {
    var r = [];
    var res = doc.evaluate(xpath, doc, dom_ns_resolver, XPathResult.ANY_TYPE, null);
    if (res) {
        var v;
        do {
            v = res.iterateNext();
            if (v) {
                r.push(v.value);
            }
        } while (v);
    }
    return r;
}

/*
 * get hotel name & code from the given rate plan doc
 */
function dom_get_hotel(doc) {

    var hotel_code = dom_get_xvalue(doc, '/x:OTA_HotelRatePlanNotifRQ/x:RatePlans/@HotelCode');
    var hotel_name = dom_get_xvalue(doc, '/x:OTA_HotelRatePlanNotifRQ/x:RatePlans/@HotelName');
    if (hotel_code && hotel_name) {
        return hotel_name + ' (' + hotel_code + ')';
    } else if (hotel_code) {
        return hotel_code;
    } else if (hotel_name) {
        return hotel_code;
    } else {
        return '';
    }
}


/*
 * The XMLDocument.evaluate() function (for some reason) doesn't apply XPath
 * expressions with no namespace to documents that have a default namesspace
 * (such as our rate plan messages).
 * 
 * For this reason we must use an (arbitrary) namespace prefix in our XPath
 * queries and map it to the rate plans' default namespace.
 * 
 * https://developer.mozilla.org/en-US/docs/Introduction_to_using_XPath_in_JavaScript
 * 
 */
function dom_ns_resolver(prefix) {
    // prefix ignored, use any (such as x)
    return 'http://www.opentravel.org/OTA/2003/05';
}


/**
 * test if DOMParser and XMLDocument.evaluate is supported in this browser
 */
function dom_has_dom3xpath() {

    if (window.DOMParser) {
        var testparser = new DOMParser();
        if (testparser.parseFromString) {
            var testxmldoc = testparser.parseFromString('<test><data v="xyz"/></test>', 'application/xml');
            if (testxmldoc.evaluate) {
                var testres = testxmldoc.evaluate('//data/@v', testxmldoc, null, 0, null);
                if (testres.iterateNext) {
                    testres = testres.iterateNext();
                    if (testres && testres.value === 'xyz') {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}


                