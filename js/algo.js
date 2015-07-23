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
 * algo.js: the actual algorithms used by uirs.js
 **********************************************************************************************************************/

'use strict';


/**
 * Prechecks the RatePlan elements in a rate plan message file.
 * Succeeds only if all the RatePlan elements have correct and unique RatePlanCode attributes.
 * 
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @returns {Object}          - ret.out -> array of RatePlanCode values or
 *                              ret.err -> string describing the first error that made this rpmsg_item invalid
 */
function precheck_rpmsg(rpmsg_item)
{
	var i;
	var ret = {out: '', err: ''};

	var rpnodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan');
	var rpcodes = {};

	for (i = 0; i < rpnodes.length; i++) {

		var rpcode = rpnodes[i].getAttribute('RatePlanCode');

		if (!rpcode) {
			ret.err = 'RatePlan[' + i + '] is missing the essential attribute RatePlanCode';
			return ret;
		}

		// the apostroph ... sic 
		if (rpcode.indexOf("'") !== -1) {
			ret.err = 'RatePlan[' + i + '] has a RatePlanCode that contains an apostroph (this is embarassing - (blush))';
			return ret;
		}

		if (rpcodes[rpcode]) {
			ret.err = 'the RatePlanCode values are not unique';
			return ret;
		}

		rpcodes[rpcode] = true;
	}

	if (Object.keys(rpcodes).length === 0) {
		ret.err = 'no rate plans found';
		return ret;
	}

	ret.out = Object.keys(rpcodes);
	return ret;
}



/**
 * Prechecks, parses and returns the Offer elements in a rate plan message file.
 * 
 * AlpineBits allows at most 1 "free nights" discount and at most 1 "family" discount.
 * If parsing is successful a datastructure holding the data from the Offer elements is returned as ret.out.
 * 
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @param {String} rpcode     - the RatePlanCode
 * @returns {Object}          - ret.out -> information about Offer elements, example:
 *									{
 *										"free_nights": { "percent":100, "nights_required":5, "nights_discounted":1,
 *										                 "discount_pattern":"00001"},
 *										"family":      { "percent":100, "age_aualifying_code":8, "max_age":5,
 *										                 "first_qualifying_position":1, "last_qualifying_position":1,
 *										                 "min_count":2 }
 *									} 
 *                              ret.err -> string describing the first error that made this rpmsg_item invalid
 */
function precheck_offers(rpmsg_item, rpcode)
{
	var i;
	var buf;
	var of, offers = {free_nights: {}, family: {}};
	var ret = {out: '', err: ''};

	var onodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Offers/x:Offer');

	// zero Offer elements -> nothing to do
	if (onodes.length === 0) {
		return ret;
	}

	// more than two Offer elements -> error
	if (onodes.length > 2) {
		ret.err = 'more than two Offer elements';
		return ret;
	}

	// for each Offer element found, determine the "kind" by looking at the Discount and Guest children
	// and save everything in offer[]

	for (i = 0; i < onodes.length; i++) {

		var dnodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Offers/x:Offer[' + (i + 1) + ']/x:Discount');
		var gnodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Offers/x:Offer[' + (i + 1) + ']/x:Guests/x:Guest');

		if (dnodes.length === 1 && gnodes.length === 0) {
			// 1 Discount child and 0 Guest children -> "free nights" discount
			of = {
				percent: Number(dnodes[0].getAttribute('Percent')),
				nights_required: Number(dnodes[0].getAttribute('NightsRequired')),
				nights_discounted: Number(dnodes[0].getAttribute('NightsDiscounted')),
				discount_pattern: dnodes[0].getAttribute('DiscountPattern')
			};
			if (!of.percent || of.percent !== 100) {
				ret.err = 'Offer[' + i + ']/Discount: attribute Percent is either missing or not set to 100';
				return ret;
			}
			if (!util.is_positive_int(of.nights_required) || !util.is_positive_int(of.nights_discounted) || !of.discount_pattern) {
				ret.err = 'Offer[' + i + ']/Discount: attributes NightsRequired, NightsDiscounted or DiscountPattern are either missing or not positive integer values';
				return ret;
			}
			if (of.nights_discounted >= of.nights_required) {
				ret.err = 'Offer[' + i + ']/Discount: NightsDiscounted cannot be >= NightsRequired)';
				return ret;
			}
			if (of.discount_pattern !== util.repeat('0', (of.nights_required - of.nights_discounted)) + util.repeat('1', of.nights_discounted)) {
				ret.err = 'Offer[' + i + ']/Discount: inconsistency between NightsRequired, NightsDiscounted and DiscountPattern';
				return ret;
			}
			offers.free_nights = of;
		} else if (dnodes.length === 1 && gnodes.length === 1) {
			// 1 Discount child and 1 Guest child -> "family" discount
			of = {
				percent: Number(dnodes[0].getAttribute('Percent')),
				age_aualifying_code: Number(gnodes[0].getAttribute('AgeQualifyingCode')),
				max_age: Number(gnodes[0].getAttribute('MaxAge')),
				first_qualifying_position: Number(gnodes[0].getAttribute('FirstQualifyingPosition')),
				last_qualifying_position: Number(gnodes[0].getAttribute('LastQualifyingPosition')),
				min_count: Number(gnodes[0].getAttribute('MinCount'))
			};
			if (!of.percent || of.percent !== 100) {
				ret.err = 'Offer[' + i + ']/Discount: attribute Percent is either missing or not set to 100';
				return ret;
			}
			if (!of.first_qualifying_position || of.first_qualifying_position !== 1) {
				ret.err = 'Offer[' + i + ']/Guests/Guest: attribute FirstQualifyingPosition is either missing or not set to 1)';
				return ret;
			}
			if (!of.min_count) {
				of.min_count = 1; /* MinCount is not mandatory, it defaults to 1 */
			}
			if (!util.is_positive_int(of.age_aualifying_code) || !util.is_positive_int(of.max_age) || !util.is_positive_int(of.last_qualifying_position)) {
				ret.err = 'Offer[' + i + ']/Guests/Guest: attributes AgeQualifyingCode, MaxAge or LastQualifyingPosition are either missing or not positive integer values';
				return ret;
			}
			offers.family = of;
		} else {
			// every other combination -> error
			ret.err = 'Offer[' + i + '] has unexpected number of Discount/Guest children - was expecting 1/0 or 1/1';
			return ret;
		}

	}

	ret.out = offers;

	return ret;
}



/**
 * Prechecks the Rate elements of the given rate plan and rate plan message file.
 * Succeeds only if all the Rate elements have correct attributes InvTypeCode, Start, End,
 * RateTimeUnit and UnitMultiplier.
 * 
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @param {String} rpcode     - the RatePlanCode
 * @returns {Object}          - ret.out -> array of unique InvTypeCode values or 
 *                              ret.err -> string describing the first error that made this rpmsg_item/rpcode invalid
 */
function precheck_rp(rpmsg_item, rpcode)
{
	var i;
	var ret = {out: '', err: ''};

	var rnodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Rates/x:Rate');

	var itcodes = {};

	for (i = 0; i < rnodes.length; i++) {

		var icode = rnodes[i].getAttribute('InvTypeCode');
		var dtsta = rnodes[i].getAttribute('Start');
		var dtend = rnodes[i].getAttribute('End');
		var rtuni = rnodes[i].getAttribute('RateTimeUnit');
		var unimu = rnodes[i].getAttribute('UnitMultiplier');

		if (!icode || !dtsta || !dtend) {
			ret.err = 'Rate[' + i + '] does not define all essential attributes InvTypeCode, Start, End';
			return ret;
		}

		// the apostroph ... sic 
		if (icode.indexOf("'") !== -1) {
			ret.err = 'Rate[' + i + '] has a InvTypeCode that contains an apostroph (this is embarassing - (blush))';
			return ret;
		}

		if (!util.is_valid_date(dtsta) || !util.is_valid_date(dtend)) {
			ret.err = 'Rate[' + i + '] has invalid Start or End dates';
			return ret;
		}

		if (util.date_diff(dtsta, dtend) < 0) {
			ret.err = 'Rate[' + i + '] has End date < Start date';
			return ret;
		}

		if (unimu && !util.is_positive_int(unimu)) {
			ret.err = 'Rate[' + i + ']  is invalid (UnitMultiplier is not a positive integer)';
			return ret;
		}

		if (unimu && (!rtuni || rtuni !== 'Day')) {
			ret.err = 'Rate[' + i + '] is invalid (for rates with UnitMultiplier, RateTimeUnit must be set to "Day")';
			return ret;
		}

		if (!unimu && rtuni) {
			ret.err = 'Rate[' + i + '] is invalid (RateTimeUnit may only be used when also Unitmultiplier is used)';
			return ret;
		}

		itcodes[icode] = true;

	}

	if (Object.keys(itcodes).length === 0) {
		ret.err = 'no rates found';
		return ret;
	}

	ret.out = Object.keys(itcodes);
	return ret;

}


/**
 * Matches the given stay against the rates.
 * 
 * @param {Object} s_item     - the stays item (see uist.js)
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @param {String} rpcode     - the RatePlanCode
 * @param {String} itcode     - the InvTypeCode
 * @param {Object} offer      - the out field as returned by precheck_offers
 * @returns {Object}          - ret.out -> summary of the cost of they stay (empty string means no match) or 
 *                              ret.err -> any errors (should be reported)
 */
function match_rates(s_item, rpmsg_item, rpcode, itcode, offer)
{
	var i, j, r;
	var dt;
	var arr = s_item.arrival;
	var dep = s_item.departure;
	var sum, cnt;
	var ret = {out: '', err: ''};
	var free_night_applied, free_night_index;

	// find rate nodes

	var rnodes = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Rates/x:Rate[@InvTypeCode=\'' + itcode + '\']');

	// check for (invalid) overlaps

	for (i = 0; i < rnodes.length; i++) {
		var is = rnodes[i].getAttribute('Start');
		var ie = rnodes[i].getAttribute('End');
		for (j = 0; j < rnodes.length; j++) {
			if (j === i) {
				continue;
			}
			var js = rnodes[j].getAttribute('Start');
			var je = rnodes[j].getAttribute('End');
			try {
				if (util.date_interval_overlaps(is, ie, js, je)) {
					ret.err = 'rate intervals overlap';
					return ret;
				}
			} catch (err) {
				ret.err = err;
				return ret;
			}

		}
	}

	// loop over the days in the stay and match them against the rates, adding the cost

	dt = arr;
	sum = 0.0;
	cnt = 0;
	free_night_index = 0;

	while (util.date_diff(dt, dep) > 0) {

		var matched = false;
		var sdate, edate, rmult;
		var gc;

		for (r = 0; r < rnodes.length; r++) {
			sdate = rnodes[r].getAttribute('Start');
			edate = rnodes[r].getAttribute('End');
			rmult = rnodes[r].getAttribute('UnitMultiplier');
			if (!rmult) {
				rmult = 1;
			}
			rmult = Number(rmult);
			if (util.date_between(sdate, edate, dt) && util.date_diff(util.date_add(dt, rmult), edate) >= -1 && util.date_diff(util.date_add(dt, rmult), dep) >= 0) {
				// ok, rate dates match, now check occupation and costs
				gc = get_cost(s_item, rpmsg_item, rpcode, itcode, r, offer.family);
				if (gc.err) {
					ret.err = gc.err;
					return ret;
				}
				if (gc.out !== '') {
					matched = true;
				}
				break;

			}
		} // warning: the loop variable r is used below to see if the loop was broken out from early


		if (matched) {

			// free nights offer possible at all?
			free_night_applied = false;
			if (rmult === 1 && offer.free_nights && offer.free_nights.nights_required <= util.date_diff(arr, dep)) {
				// is this night (free_night_index) a free night?
				// (free_night_index wraps around)
				if (free_night_index >= offer.free_nights.discount_pattern.length) {
					free_night_index = 0;
				}
				if (offer.free_nights.discount_pattern[free_night_index] === '1') {
					gc.out = 0.0;
					free_night_applied = true;
				}
				free_night_index++;
			}

			sum += Number(gc.out);
			cnt++;
			ret.out += 'EUR ' + gc.out + ' for ' + dt + ' (' + util.plural('night', rmult) + ') ';
			if (free_night_applied) {
				ret.out += 'matched by free night discount';
			} else {
				ret.out += 'matched by rate[' + r + '] (' + sdate + ' … ' + edate + ')';
			}
			if (gc.children) {
				ret.out += ' + family discount (' + util.plural('child', gc.children.length) + ' paying';
				if (gc.children.length > 0) {
					ret.out += ', ages: ' + gc.children.join(', ');
				}
				ret.out += ')';
			}
			ret.out += '\n';
			dt = util.date_add(dt, rmult); // continue while with next date to match

		} else {

			cnt = 0;
			ret.out = 'no match, the first night that didn\'t match was ' + dt;
			if (r === rnodes.length) {
				ret.out += ' (no rate matched the date/LOS)';
			} else {
				ret.out += ' (a rate matched the date/LOS, but not the occupation)';
			}
			ret.out += '\n';
			break;  // exit while, there was no match

		}

	}

	// add line with sum

	if (cnt > 0) {
		ret.out += '----------------------------------------------------------------------------------------\n';
		ret.out += 'EUR ' + sum;
		if (sum <= 0.0) {
			ret.out += ' (THIS SHOULD NOT be SHOWN TO THE CUSTOMER)';
		}
		ret.out += '\n';
	}

	return ret;
}


/**
 * Computes the cost of a single given Rate element for the occupation given in the stay.
 * At the end of the function is an excerpt from the standard document on how the cost is computed.
 * 
 * @param {Object} s_item     - the stays item (see uist.js)
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @param {String} rpcode     - the RatePlanCode
 * @param {String} itcode     - the InvTypeCode
 * @param {Number) rate_index - the 0-based index of the Rate (since rpcode, itcode alone don't uniquely define the rate)
 * @param {Object} family     - the family object of the out field as returned by precheck_offers (can be undefined)
 * @returns {Object}          - ret.out -> cost of the stay (just the number), whereby an empty string means no match or 
 *                              ret.err -> errors (should be reported)
 *                              and, only if a family discount was applied also
 *                              ret.children -> array with effectively used ages after discount
 */
function get_cost(s_item, rpmsg_item, rpcode, itcode, rate_index, family)
{

	var ret = {out: '', err: ''};
	var tot, std, n;
	var i, c;
	var sum, amt, cheapest;
	var min, max;
	var children_after_discount, num_children_lt_max_age;

	// find BaseByGuestAmt and AdditionalGuestAmount elements for the given rate

	var query_prefix = '(//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:Rates/x:Rate[@InvTypeCode=\'' + itcode + '\'])[' + (rate_index + 1) + ']';
	var base_amt = dom_get_xnodes(rpmsg_item.doc, query_prefix + '//x:BaseByGuestAmt');
	var addi_amt = dom_get_xnodes(rpmsg_item.doc, query_prefix + '//x:AdditionalGuestAmount');

	// need at least one BaseByGuestAmt

	if (base_amt.length === 0) {
		return ret;
	}

	// BaseByGuestAmt:
	// find the standard occupation (inferred from the maximum value of NumberOfGuests)
	// also check for errors in the attributes NumberOfGuests and AmountAfterTax

	var nums_seen = {};
	std = 0;
	for (i = 0; i < base_amt.length; i++) {
		n = base_amt[i].getAttribute('NumberOfGuests');
		if (!util.is_positive_int(n)) {
			ret.err = 'BaseByGuestAmt attribute NumberOfGuests is not defined or invalid (must be a positive int)';
			return ret;
		}
		if (nums_seen[n]) {
			ret.err = 'BaseByGuestAmt attribute NumberOfGuests is not unique inside the same BaseByGuestAmts';
			return ret;
		}
		nums_seen[n] = true;
		n = Number(n);
		if (n > std) {
			std = n;
		}
		amt = base_amt[i].getAttribute('AmountAfterTax');
		if (!amt || isNaN(Number(amt))) {
			ret.err = 'BaseByGuestAmt attributes AmountAfterTax is not defined or invalid (must be numeric)';
			return ret;
		}
	}
	if (std === 0) {
		return ret;
	}

	// AdditionalGuestAmount:
	// check for errors (Amount, MinAge, MaxAge)

	for (i = 0; i < addi_amt.length; i++) {
		amt = addi_amt[i].getAttribute('Amount');
		if (!amt || isNaN(Number(amt))) {
			ret.err = 'AdditionalGuestAmount attribute Amount is not defined or invalid (must be numeric)';
			return ret;
		}
		min = addi_amt[i].getAttribute('MinAge');
		if (min && (!util.is_positive_int(min) || min > 999)) {
			ret.err = 'AdditionalGuestAmount attribute MinAge is invalid (allowed values are 1 ... 999 (OTA))';
			return ret;
		}
		if (!min) {
			min = 0;
		}
		min = Number(min);
		max = addi_amt[i].getAttribute('MaxAge');
		if (max && (!util.is_positive_int(max) || max > 999)) {
			ret.err = 'AdditionalGuestAmount attribute MaxAge is invalid (allowed values are 1 ... 999 (OTA))';
			return ret;
		}
		if (!max) {
			max = 1000;
		}
		max = Number(max);
		if (min && max && (min > max)) {
			ret.err = 'AdditionalGuestAmount attributes MinAge and MaxAge are inconsistent (MinAge = ' + min + ', MaxAge = ' + max;
			return ret;
		}
		if (nums_seen[Number(max) * 1000 + Number(min)]) {
			ret.err = 'AdditionalGuestAmount attributes MinAge and MaxAge are not unique inside the same AdditionalGuestAmount';
			return ret;
		}
		nums_seen[Number(max) * 1000 + Number(min)] = true;
	}

	// s_item.children is the list of children (an array of ages)
	// 
	//   -> if a family discount applies, one or more of these children will go free
	//      
	//      the relevant fields in family are:
	//      - max_age:                  only children < max_age are considered for discount
	//      - min_count:                at least this many children (< max_age) must be present for the discount to be applicable
	//      - last_qualifying_position: number of children that go free 
	//
	// compute children_after_discount from s_item.children applying the family account (it applicable)
	// 
	// note this is computed here (and not up in the handling of the stay) because as of now only 100 percent
	// discounts are allowed, should this change or should future discount schemes depend on other cost components,
	// the only place where this can be computed is here

	num_children_lt_max_age = 0;
	if (family) {
		for (i = 0; i < s_item.children.length; i++) {
			if (s_item.children[i] < family.max_age) {
				num_children_lt_max_age++;

			}
		}
	}

	children_after_discount = s_item.children;

	if (family && num_children_lt_max_age >= family.min_count) {
		// remove the youngest child (repeated last_qualifying_position or num_children_lt_max_age (whichever is smaller) times)
		for (i = 0; i < Math.min(family.last_qualifying_position, num_children_lt_max_age); i++) {
			children_after_discount = util.remove_min(children_after_discount);
		}
	}

	if (s_item.children.length !== children_after_discount.length) {
		ret.children = children_after_discount;
	}

	// tot = total number of guests in this stay

	tot = s_item.num_adults + children_after_discount.length;

	// If the total number of guests in the stay is <= std, pick the BaseByGuestAmt with NumberOfGuests == total number
	// of guests (so any children pay as adults).

	// If the right pick is not there, a no match will be returned.

	if (tot <= std) {

		for (i = 0; i < base_amt.length; i++) {
			n = Number(base_amt[i].getAttribute('NumberOfGuests'));
			if (n === tot) {
				sum = Number(base_amt[i].getAttribute('AmountAfterTax'));
				ret.out = Math.round(100.0 * sum) / 100.0;
				;  // match
				return ret;
			}
		}

		return ret; // no match

	}

	// If the total number of guests in the stay is > std, pick the BaseByGuestAmt with NumberOfGuests == std and
	// pick the AdditionalGuestAmount elements for the remaining guests.

	// To do this correctly for all cases (adults < std, adults == std, adults > std), we might need to have children
	// pay full or fit adults into the additional guests. To do this, we throw all people into a unified pool (we
	// can take the adult age as 999 (which is the OTA maximum)), then we consider the std oldest people from 
	// the pool to pay the BaseByGuestAmt with NumberOfGuests == std price. The remaining people are then fit into
	// the additional guests

	if (tot > std) {

		var people = [];
		sum = 0.0;

		// adults -> people

		for (i = 0; i < s_item.num_adults; i++) {
			people.push(999);
		}

		// children -> people

		for (i = 0; i < children_after_discount.length; i++) {
			people.push(children_after_discount[i]);
		}

		// sort people

		people = people.sort(function (a, b) {
			return a - b;
		});

		// have the std oldest pay BaseByGuestAmt and remove them from people[]

		for (i = 0; i < base_amt.length; i++) {
			n = Number(base_amt[i].getAttribute('NumberOfGuests'));
			if (n === std) {
				sum += Number(base_amt[i].getAttribute('AmountAfterTax'));
				break;
			}
		}

		for (i = 0; i < std; i++) {
			people.pop();
		}

		// remaining people go into additional guests 

		for (c = 0; c < people.length; c++) {

			// note that AdditionalGuestAmount ranges might overlap in that it's possibile to have
			// the "adult" addition guest that would be a catch all entry - we simply pick the cheapest price
			// for every person to avoid the ambiguity

			cheapest = NaN;
			for (i = 0; i < addi_amt.length; i++) {
				amt = addi_amt[i].getAttribute('Amount');
				amt = Number(amt);
				min = addi_amt[i].getAttribute('MinAge');
				if (!min) {
					min = 0;
				}
				min = Number(min);
				max = Number(addi_amt[i].getAttribute('MaxAge'));
				if (!max) {
					max = 1000;
				}
				max = Number(max);
				if (people[c] >= min && people[c] < max) {
					if (isNaN(cheapest) || amt < cheapest) {
						cheapest = amt;
					}
				}
			}

			if (isNaN(cheapest)) {
				return ret; // no match
			}

			sum += cheapest;

		}

		ret.out = Math.round(100.0 * sum) / 100.0;
		return ret; // match

	}

	// assert(false);

	ret.err = 'oops - this shouldn\'t happen';
	ret.out = '';

	return ret;

}

/*
 
 [From the standard document, concerning costs.]
 
 Rate elements contain costs (all amounts are taken to be in EUR and after taxes).
 Two kinds of elements are used: BaseByGuestAmt and AdditionalGuestAmount. These are
 used according to the minimum (min) ≤ standard (std) ≤ maximum (max) occupancies as
 defined in Inventory (see section 4.4).
 
 Concerning rates, AlpineBits dictates the following:
 
 - min ≤ number of guests ≤ max,
 
 - one BaseByGuestAmt element with attribute NumberOfGuests = std must be present,
 
 - more BaseByGuestAmt elements with values between min and std - 1 can be present,
 
 - if and only if std < max, AdditionalGuestAmount are also present: these amounts
 always refer to one person and have attribute AgeQualifyingCode (8 → child, 10 → adult)
 and age brackets,
 
 - when computing the total cost:
 
 - when the number of guests ≤ std, the cost computation algorithm will pick the
 BaseByGuestAmt matching the number of guests (no match if the right BaseByGuestAmt
 is not present),
 
 - when the number of guests > std, the algorithm will pick the BaseByGuestAmt for
 std guests and AdditionalGuestAmount elements for the remaining guests,
 
 - if the number of adults is < std, the algo uses children as adults (have them pay 
 full price),
 
 - it is possible that only AdditionalGuestAmount elements with the code AgeQualifyingCode 10
 (no child rates).
 
 */


/**
 * Find any booking rules that would restrict this stay from matching in the first place.
 * 
 * @param {Object} s_item     - the stays item (see uist.js)
 * @param {Object} rpmsg_item - the rpmsg item (see uirp.js)
 * @param {String} rpcode     - the RatePlanCode
 * @param {String} code       - the Code (same meaning as InvTypeCode for rates)
 * @returns {Object}          - ret.out -> summary of the cost of they stay (empty string means no match) or 
 *                              ret.err -> any errors (should be reported)
 */
function find_restrictions(s_item, rpmsg_item, rpcode, code)
{
	var i, j, k, m, n;
	var s, e, dt;
	var arr = s_item.arrival;
	var dep = s_item.departure;
	var a, ch, los, dow;
	var ret = {out: '', err: ''};

	var rules = {generic: [], specific: []};

	// find rules (generic - without Code)

	rules.generic = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:BookingRules/x:BookingRule[not(@Code)]');

	// find rules (specific - with Code=code)

	rules.specific = dom_get_xnodes(rpmsg_item.doc, '//x:RatePlan[@RatePlanCode=\'' + rpcode + '\']/x:BookingRules/x:BookingRule[@Code=\'' + code + '\']');

	// Just some validity checks:
	//   - Start & End are given and valid
	//   - no overlaps,
	//   - generic rules must not have attribute CodeContext,
	//   - specific rules must have attribute CodeContext="ROOMTYPE".

	for (k in rules) {
		var is, ie;
		for (i = 0; i < rules[k].length; i++) {
			is = rules[k][i].getAttribute('Start');
			ie = rules[k][i].getAttribute('End');
			if (!util.is_valid_date(is) || !util.is_valid_date(ie)) {
				ret.err = 'missing or invalid Start or End dates for some ' + k + ' booking rule';
				return ret;
			}
			if (util.date_diff(is, ie) < 0) {
				ret.err = 'End date < Start date for some ' + k + ' booking rule';
				return ret;
			}

		}
		for (i = 0; i < rules[k].length; i++) {
			var is = rules[k][i].getAttribute('Start');
			var ie = rules[k][i].getAttribute('End');
			for (j = 0; j < rules[k].length; j++) {
				if (j === i) {
					continue;
				}
				var js = rules[k][j].getAttribute('Start');
				var je = rules[k][j].getAttribute('End');
				if (util.date_interval_overlaps(is, ie, js, je)) {
					ret.err = 'intervals overlap for some ' + k + ' booking rule';
					return ret;
				}
			}
		}
	}
	for (i = 0; i < rules.generic.length; i++) {
		var cc = rules.generic[i].getAttribute('CodeContext');
		if (cc !== null) {
			ret.err = 'a generic booking rule has the CodeContext attribute';
			return ret;
		}
	}
	for (i = 0; i < rules.specific.length; i++) {
		var cc = rules.specific[i].getAttribute('CodeContext');
		if (!cc || cc !== 'ROOMTYPE') {
			ret.err = 'a specific booking rule is missing CodeContext="ROOMTYPE"';
			return ret;
		}
	}

	// RestrictionStatus:
	// each day of the stay (excluding the departure day) must not be denied by a master status Close rule.

	dt = arr;
	while (util.date_diff(dt, dep) > 0) {
		for (k in rules) {
			for (i = 0; i < rules[k].length; i++) {
				s = rules[k][i].getAttribute('Start');
				e = rules[k][i].getAttribute('End');
				if (util.date_between(s, e, dt)) {
					ch = rules[k][i].children;
					for (j = 0; j < ch.length; j++) {
						if (ch[j].nodeName === 'RestrictionStatus') {
							if (ch[j].getAttribute('Restriction') === 'Master') {
								if (ch[j].getAttribute('Status') === 'Close') {
									ret.out = 'a booking rule has restriction status closed for ' + dt;
									return ret;
								} else if (ch[j].getAttribute('Status') !== 'Open') {
									ret.err = 'RestrictionStatus element: expected Status="Open" or Status="Close" attribute';
									return ret;
								}
							} else {
								ret.err = 'RestrictionStatus element: expected Restriction="Master" attribute';
								return ret;
							}
						}
					}
				}
			}
		}
		dt = util.date_add(dt, 1);
	}

	// Checks on length of stay (LOS) and days of week (DOW).

	var dows = ['Sun', 'Mon', 'Tue', 'Weds', 'Thur', 'Fri', 'Sat'];
	var len = util.date_diff(s_item.arrival, s_item.departure);

	for (k in rules) {

		for (i = 0; i < rules[k].length; i++) {

			s = rules[k][i].getAttribute('Start');
			e = rules[k][i].getAttribute('End');

			// Checks regarding arrival day:
			// the length of stay and arrival day of week restriction of any booking rule that applies to the
			// arrival day must be satisfied (booking rules apply if Start ≤ arrival day ≤ End).  

			if (util.date_between(s, e, arr)) {

				ch = rules[k][i].children;
				for (j = 0; j < ch.length; j++) {
					if (ch[j].nodeName === 'LengthsOfStay') {
						los = ch[j].children;
						for (m = 0; m < los.length; m++) {
							if (los[m].nodeName === "LengthOfStay") {
								var los_tu = los[m].getAttribute('TimeUnit');
								var los_mm = los[m].getAttribute('MinMaxMessageType');
								var los_ti = los[m].getAttribute('Time');
								if (!util.is_positive_int(los_ti)) {
									ret.err = 'LengthOfStay element: no attribute Time with positive integer value';
									return ret;
								}
								if (los_tu === 'Day' && los_mm === 'SetMinLOS') {
									if (len < los_ti) {
										ret.out = 'a booking rule forbids this stay (LOS too short)';
										return ret;
									}
								} else if (los_tu === 'Day' && los_mm === 'SetMaxLOS') {
									if (len > los_ti) {
										ret.out = 'a booking rule forbids this stay (LOS too long)';
										return ret;
									}
								} else {
									ret.err = 'LengthOfStay element: expected TimeUnit="Day" and MinMaxMessageType="SetMinLOS" or "SetMaxLOS"';
									return ret;
								}
							}
						}
					}
					if (ch[j].nodeName === 'DOW_Restrictions') {
						dow = ch[j].children;
						for (m = 0; m < dow.length; m++) {
							// Attributes are Sun, Mon, Tue, Weds, Thur, Fri, Sat.
							// To avoid ambiguity, AlpineBits requires all attributes to be present if
							// the element is present. Note that XML schema allows the values 0, 1, false or true. 
							if (dow[m].nodeName === "ArrivalDaysOfWeek") {
								for (n = 0; n < dows.length; n++) {
									a = dow[m].getAttribute(dows[n]);
									if (['0', '1', 'false', 'true'].indexOf(a) === -1) {
										ret.err = 'ArrivalDaysOfWeek element: expected attributes Sun, Mon, Tue, Weds, Thur, Fri and Sat with values "0", "1", "false" or "true"';
										return ret;
									}
									if (n === util.date_dow(arr) && a !== '1' && a !== 'true') {
										ret.out = 'a booking rule forbids this stay (ArrivalDaysOfWeek restriction)';
										return ret;
									}
								}
							}
						}
					}
				}

			} // end arrival day checks


			// Checks regarding departure day:
			// the departure day of week restriction of any booking rule that applies to the depature day must be
			// satisfied (booking rules apply if Start ≤ departure day ≤ End (note the less or equal is correct here)).  

			if (util.date_between(s, e, dep)) {

				ch = rules[k][i].children;
				for (j = 0; j < ch.length; j++) {
					if (ch[j].nodeName === 'DOW_Restrictions') {
						dow = ch[j].children;
						for (m = 0; m < dow.length; m++) {
							// Attributes are Sun, Mon, Tue, Weds, Thur, Fri, Sat.
							// To avoid ambiguity, AlpineBits requires all attributes to be present if
							// the element is present. Note that XML schema allows the values 0, 1, false or true. 
							if (dow[m].nodeName === "DepartureDaysOfWeek") {
								for (n = 0; n < dows.length; n++) {
									a = dow[m].getAttribute(dows[n]);
									if (['0', '1', 'false', 'true'].indexOf(a) === -1) {
										ret.err = 'DepartureDaysOfWeek element: expected attributes Sun, Mon, Tue, Weds, Thur, Fri and Sat with values "0", "1", "false" or "true"';
										return ret;
									}
									if (n === util.date_dow(dep) && a !== '1' && a !== 'true') {
										ret.out = 'a booking rule forbids this stay (DepartureDaysOfWeek restriction)';
										return ret;
									}
								}
							}
						}
					}
				}

			} // end departure day checks

		} // for rules[i]

	} //  for (k in rules)

	return ret;

}
