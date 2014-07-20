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
 * uirs.js: user interface for the results section
 **********************************************************************************************************************/

'use strict';


function uirs_compute_results() {

	var si, rpmi, rpi, ri;
	var rpc, offer, itc;
	var buf, crumb1, crumb2, crumb3;
	var err = [];
	var report_out;
	var ret;

	var report = document.getElementById('report');
	report.innerHTML = '';

	if (uirp_count_good_rpmsg() === 0) {
		err.push('no rate plan message files available');
	}
	if (!stays || stays.length === 0) {
		err.push('no stays available');
	}

	if (err.length > 0) {
		report.innerHTML = 'cannot compute results: ' + err.join(', ');
		return;
	}

	report_out = '';

	// --- loop over all stays -----------------------------------------------------------------------------------------

	for (si = 0; si < stays.length; si++) {

		var st = stays[si];

		// summary for this stay

		var nights = util.date_diff(st.arrival, st.departure);

		buf = 'stay &ldquo;' + st.name + '&rdquo;:&nbsp; '
				+ util.plural('night', nights) + ' starting ' + st.arrival + ',&nbsp; '
				+ util.plural('adult', st.num_adults);
		if (st.children.length > 0) {
			buf += ' and ' + util.plural('child', st.children.length) + ' (ages: ' + st.children.join(', ') + ')';
		}
		report_out += util.tag(buf, 'h3');

		// --- loop over all rate plan message files -------------------------------------------------------------------

		for (rpmi = 0; rpmi < rpmsg.items.length; rpmi++) {

			// skip bad message files

			if (rpmsg.items[rpmi].state !== uirp_GOOD) {
				continue;
			}

			crumb1 = 'message file "<b>' + rpmsg.items[rpmi].name + '</b>"';

			// precheck RatePlan nodes in message and extract RatePlanCode values

			rpc = precheck_rpmsg(rpmsg.items[rpmi]);
			if (rpc.err) {
				report_out += util.tag('warning: ' + crumb1 + ' skipped (' + rpc.err + ')', 'p', 'rswarn');
				continue;
			}

			// --- loop over all RatePlanCode values -------------------------------------------------------------------

			for (rpi = 0; rpi < rpc.out.length; rpi++) {

				crumb2 = crumb1 + '&rarr; rate plan code "<b>' + rpc.out[rpi] + '</b>"';

				// precheck Rate nodes in rate plan and extract unique InvTypeCode values

				itc = precheck_rp(rpmsg.items[rpmi], rpc.out[rpi]);
				if (itc.err) {
					report_out += util.tag('warning: ' + crumb2 + ' skipped (' + itc.err + ')', 'p', 'rswarn');
					continue;
				}

				// precheck Offer nodes and populate offer object

				offer = precheck_offers(rpmsg.items[rpmi], rpc.out[rpi]);
				if (offer.err) {
					report_out += util.tag('warning: ' + crumb1 + ' skipped (' + offer.err + ')', 'p', 'rswarn');
					continue;
				}

				// --- loop over all unique InvTypeCode values ---------------------------------------------------------

				for (ri = 0; ri < itc.out.length; ri++) {

					crumb3 = crumb2 + '&rarr; rates with inv type code "<b>' + itc.out[ri] + '</b>"';

					report_out += util.tag(crumb3, 'p', 'rstitle');

					// first check if there are any booking rules that would restrict this stay
					// from matching in the first place

					ret = find_restrictions(st, rpmsg.items[rpmi], rpc.out[rpi], itc.out[ri]);
					if (ret.err) {
						// error -> warn and continue to next iteration
						report_out += util.tag('warning: ' + crumb3 + ' skipped (' + ret.err + ')', 'p', 'rswarn');
						continue;
					} else if (ret.out) {
						// output -> a rule forbids the stay -> print and continue to next iteration
						report_out += util.tag(ret.out.replace(/\n/g, '<br>'), 'p', 'rsok');
						continue;
					}

					// then check if there are rates that can satisfy this stay
					// passing the offer object with the prechecked Offer nodes, if any

					ret = match_rates(st, rpmsg.items[rpmi], rpc.out[rpi], itc.out[ri], offer.out);
					if (ret.err) {
						// error -> warn and continue to next iteration
						report_out += util.tag('warning: ' + crumb3 + ' skipped (' + ret.err + ')', 'p', 'rswarn');
						continue;
					} else if (ret.out) {
						// output -> there was a matching rate -> print and continue to next iteration
						report_out += util.tag(ret.out.replace(/\n/g, '<br>'), 'p', 'rsok');
						continue;
					}

				}

			} // loop over all RatePlanCode values

		} // loop over all rate plan message files

	} // loop over all stays

	report.innerHTML = report_out;

}


