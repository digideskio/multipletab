var EXPORTED_SYMBOLS = ['documentToCopyText', 'isFormatRequiresLoaded'];

var Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'evaluateXPath', 'resource://multipletab-modules/xpath.js');

function documentToCopyText(aDocument, aParams) {
	var format = aParams.format || '%URL%';
	var now = aParams.now || new Date();
	var doc = aDocument;
	var uri = mayDecodeURI(aParams.uri || doc.defaultView.location.href);
	var title = doc.title;
	if (!title || uri == 'about:blank')
		title = aParams.title;
	var lineFeed = aParams.lineFeed;

	var requireLoaded = isFormatRequiresLoaded(format);
	var author = requireLoaded && getMetaInfo(doc, 'author') || '';
	var description = requireLoaded && getMetaInfo(doc, 'description') || '';
	var keywords = requireLoaded && getMetaInfo(doc, 'keywords') || '';
	var timeUTC = now.toUTCString();
	var timeLocal = now.toLocaleString();

	var formatted = format
			.replace(/%(?:RLINK|RLINK_HTML(?:IFIED)?|SEL|SEL_HTML(?:IFIED)?)%/gi, '')
			.replace(/%URL%/gi, uri)
			.replace(/%(?:TITLE|TEXT)%/gi, title)
			.replace(/%URL_HTML(?:IFIED)?%/gi, escapeForHTML(uri))
			.replace(/%TITLE_HTML(?:IFIED)?%/gi, escapeForHTML(title))
			.replace(/%AUTHOR%/gi, author)
			.replace(/%AUTHOR_HTML(?:IFIED)?%/gi, escapeForHTML(author))
			.replace(/%DESC(?:RIPTION)?%/gi, description)
			.replace(/%DESC(?:RIPTION)?_HTML(?:IFIED)?%/gi, escapeForHTML(description))
			.replace(/%KEYWORDS%/gi, keywords)
			.replace(/%KEYWORDS_HTML(?:IFIED)?%/gi, escapeForHTML(keywords))
			.replace(/%UTC_TIME%/gi, timeUTC)
			.replace(/%LOCAL_TIME%/gi, timeLocal)
			.replace(/%TAB%/gi, '\t')
			.replace(/%EOL%/gi, lineFeed)
			.replace(/%RT%/gi, '');

	var isRichText = /%RT%/i.test(format);
	if (isRichText && !formatted.trim())
		formatted = '<a href=\"' + escapeForHTML(uri) + '\">' + escapeForHTML(title) + '</a>';

	return formatted;
}

function getMetaInfo(aDocument, aName) {
	var upperCase = aName.toUpperCase();
	var lowerCase = aName.toLowerCase();
	return evaluateXPath(
			'/descendant::*[translate(local-name(), "META", "meta")="meta"][translate(@name, "'+upperCase+'", "'+lowerCase+'")="'+lowerCase+'"]/attribute::content',
			aDocument,
			Ci.nsIDOMXPathResult.STRING_TYPE
		).stringValue;
}

function escapeForHTML(aString) {
	return aString
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
}

function isFormatRequiresLoaded(aFormat) {
	return /%AUTHOR%|%AUTHOR_HTML(?:IFIED)?%|%DESC(?:RIPTION)?%|%DESC(?:RIPTION)?_HTML(?:IFIED)?%|%KEYWORDS%%KEYWORDS_HTML(?:IFIED)?%/i.test(aFormat);
}

function mayDecodeURI(aURI) {
	if (!aURI || Services.prefs.getBoolPref('network.standard-url.escape-utf8'))
		return aURI;
	// See chrome://browser/content/browser.js
	var window = Services.wm.getMostRecentWindow('navigator:browser');
	if (window && 'losslessDecodeURI' in window) try {
		return window.losslessDecodeURI(window.makeURI(aURI))
			.replace(/ /g, '%20');
	}
	catch(e) {
		Components.utils.reportError(e);
	}
	return aURI;
}
