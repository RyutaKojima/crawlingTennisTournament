function testCalendar() {
    const result = registerCalendar({name: 'test', date: '2018年10月23日(日)'});
}

function myFunction() {
  var i;
  const date = new Date();
  
  for (i=0; i < 5; i++) {
    scrapingAndRegisterCalendar(date);
    date.setMonth(date.getMonth()+1);
  }
}

function scrapingAndRegisterCalendar(date) {
  const targetDomain = PropertiesService.getScriptProperties().getProperty('targetDomain');
  const url = targetDomain + "?qdate=" + date.getFullYear() + "-" + (date.getMonth()+1) + "&qpref%5B%5D=34&search=1";
  const response = UrlFetchApp.fetch(url);
  const content = response.getContentText('shift-jis');

  const tableContent = trimTargetTable(content);
  const tBody = trimTbody(tableContent);
  const tournamentArray = convertHtmlToJson(tBody);
  
  tournamentArray.forEach(function(val) {
    registerCalendar(val);
  });
}

function trimTargetTable(contentString) {
  var startIndex = -1;
  var endIndex = -1;
  
  startIndex = contentString.indexOf('<table class="new listview subsection body');
  if (startIndex === -1) {
    startIndex = contentString.indexOf('listview subsection body');
  }
  if (startIndex === -1) {
    return '';
  }

  endIndex = contentString.indexOf('</table>', startIndex);
  if (endIndex === -1) {
    return '';
  }
  
  endIndex += '</table>'.length;
  return contentString.substring(startIndex, endIndex);
}

function trimTbody(tableString) {
  var startIndex = -1;
  var endIndex = -1;
  
  startIndex = tableString.indexOf('<tbody>');
  if (startIndex === -1) {
    return '';
  }

  endIndex = tableString.indexOf('</tbody>', startIndex);
  if (endIndex === -1) {
    return '';
  }
  
  endIndex += '</tbody>'.length;
  return tableString.substring(startIndex, endIndex);
}

function convertHtmlToJson(content) {
  const trRegexp = /<tr[^>]*>(.|\s)+?<\/tr>/img;
  const fetchRegexp = /<td[^>]*>((.|\s)*?)<\/td>\s*/img;
  const aTagRegexp = /<a[^>]*>(.*)<\/a>/i;
  const trArray = [];
  var match;
  while((match = trRegexp.exec(content)) !== null) {
    trArray.push(match[0]);
  }
  
  const tournamentArray = [];
  trArray.forEach(function(val) {
    var match;
    const struct = [];
    while((match = fetchRegexp.exec(val)) !== null) {
      var tdContain = match[1];
      var aTagMatch = aTagRegexp.exec(tdContain);
      if (aTagMatch === null) {
        struct.push(tdContain);
      } else {
        struct.push(aTagMatch[1]);
      }
    }

    tournamentArray.push({
      date: struct[0],
      prefecture: struct[1],
      name: struct[2],
      type: struct[3],
      rank: struct[4],
      active: struct[5],
    });
  });

  return tournamentArray;
}

function registerCalendar(val) {
  const calendarId = PropertiesService.getScriptProperties().getProperty('GoogleCalendarId');
  const calendar = CalendarApp.getCalendarById(calendarId);
 
  const dateRegexp = /(\d+)年(\d+)月(\d+)日/i;
  const match = dateRegexp.exec(val.date);
  const date = new Date(match[1], (match[2]-1), match[3]);
  const events = calendar.getEventsForDay(date);
  
  // 重複登録をガード
  var exists = false;
  events.forEach(function(event){
    if (event.getTitle() === val.name) {
      exists = true;
    }
  });
  
  if ( ! exists) {
    return calendar.createAllDayEvent(val.name, date);
  } else {
    return false;
  }
}
