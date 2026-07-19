{
	"translatorID": "e0e66928-36d5-4a4d-b484-4bf60dae988c",
	"label": "Intrigue",
	"creator": "Shengchen Zhang",
	"target": "",
	"minVersion": "1.1",
	"maxVersion": "",
	"priority": 400,
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2026-07-18 22:55:31"
}

function doExport() {
	var item;
	var exportData = {
		source: 'zotero',
		notes: []
	};
	item = Zotero.nextItem();
	var libraryId = item.libraryID ? item.libraryID : 0;
	// data.source = 'zotero';
	exportData.title = item.title;
	exportData.year = Number.parseInt(Zotero.Utilities.strToDate(item.date).year);
	exportData.author = item.creators.map(function (author) {
		return {
			given: author.firstName,
			family: author.lastName
		}
	});
	exportData.url = "zotero://select/items/" + libraryId + "_" + item.key;
	for (let note of item.notes) {
		exportData.notes.push(note.note);
	}
	Zotero.write(JSON.stringify(exportData));
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
