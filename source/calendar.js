var todayview = 0;
var todayviewswitch = {
	unit: "month",
	timer: 0,
	delay: 200,
	prevent: false
};
var hoverdate;
var clickdate;
var monthnames = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
var calendar = document.getElementById('calendar');

document.getElementById("version").innerHTML =  remote.app.getVersion();

todayBar();
setInterval(todayBar, 1000);

if (settings["calendar-mode"].default_clickdate == "thismonth") {
	var today = new Date();
	hoverdate = today.getFullYear()+"-"+(today.getMonth()+1);
	clickdate = today.getFullYear()+"-"+(today.getMonth()+1);
}

function update(hover) {
	var today = new Date();
	if (!hoverdate) {
		hoverdate = encodeDate(today);
		clickdate = encodeDate(today);
	}

	if (hoverdate.split("-").length==3)
		previewSchedule(hoverdate);
	else
		previewMonthSchedule(hoverdate);

	if (clickdate.split("-").length==3)
		document.getElementById("jumpmonthheader").classList.remove("clickeddate");
	else
		document.getElementById("jumpmonthheader").classList.add("clickeddate");

	if (hover) return;
	if (todayview==0)
		generateCalendar(schedule.orderedList);
	else
		generateCalendar(schedule.orderedList,today.getMonth()+todayview);
}

ipc.on("schedule", function (event, arg) {
	schedule = JSON.parse(arg);
	// upcomingdeadlines = JSON.parse(arg).upcomingDeadlines.tasks;
	// dc = JSON.parse(arg).upcomingDeadlines.dc;
	// days = JSON.parse(arg).upcomingDeadlines.days;
	// schedule.orderedList = JSON.parse(arg).orderedList;

	console.log(schedule);
	update();
});

function generateCalendar(tasks,month) {
	// calendar.removeChild(calendar.getElementsByClassName("table")[0]);
	calendar.getElementsByClassName("table")[0].remove();
	// weekdays
	var week = ["Pn","Wt","Ś","Cz","Pt","So","N"];

	var table = document.createElement("div");
	table.classList.add("table");
	var row = document.createElement("div");
	row.classList.add("row");
	week.forEach(function(day) {
		var cell = document.createElement("span");
		cell.classList.add("cell");
		cell.classList.add("dayofweek");
		cell.innerHTML = day;
		row.appendChild(cell);
	});
	table.appendChild(row);

	var today = new Date();
	var d = new Date(today.getTime());
	if (typeof month != "number") var month = today.getMonth();
	else d.setFullYear(d.getFullYear(), month, 1);

	var dend = new Date(d.getTime()); //end of month
	// dend.setDate(32 - new Date(dend.getFullYear(), dend.getMonth(), 32).getDate());
	var thismonth = d.getMonth();
	dend.setFullYear(d.getFullYear(), d.getMonth()+1, 1);

	var dbegin = new Date(d.getTime());
	dbegin.setDate(1);
	if (dbegin.getDay()==0) dbegin.setDate(-5);
	else dbegin.setDate(dbegin.getDay()-2*(dbegin.getDay()-1));

	while(dbegin.getTime()<dend.getTime()){
		var row = document.createElement("div");
		row.classList.add("row");
		//tygodnie
		week.forEach(function(day) {
			var cell = document.createElement("span");
			cell.classList.add("cell");
			cell.classList.add("day");
			if (dbegin.getMonth()!=thismonth)
				cell.classList.add("notthismonth");
			if (dbegin.getTime()==today.getTime()){
				cell.innerHTML = "<span class='today'>"+dbegin.getDate()+"</span>";
			} else cell.innerHTML = dbegin.getDate();
			cell.setAttribute("data-date",dbegin.getFullYear()+"-"+(dbegin.getMonth()+1)+"-"+dbegin.getDate());
			if (cell.getAttribute("data-date") == clickdate) {
				cell.classList.add("clickeddate");
			}
			if (getDaySchedule(cell.getAttribute("data-date")).length) 
				cell.classList.add("hastasks")
			
			cell.addEventListener("click", function() {
				hoverdate = cell.getAttribute("data-date");
				clickdate = cell.getAttribute("data-date");
				update();
			});
			cell.addEventListener("dblclick", function() {
				showForm('add',undefined,cell.getAttribute("data-date"));
			});
			cell.addEventListener("mouseover", function() {
				hoverdate = cell.getAttribute("data-date");
				update(true);
			});
			cell.addEventListener("mouseleave", function() {
				hoverdate = clickdate;
				update(true);
			});
			row.appendChild(cell);
			dbegin.setDate(dbegin.getDate()+1);
		});
		table.appendChild(row);
	}

	calendar.appendChild(table);

	if (todayviewswitch.unit=="year") {
		document.getElementById("jumpmonthheader").innerHTML = 
		"<span id='jumpmonth'>"+monthnames[d.getMonth()]+"</span>"
		+" "+
		"<span id='jumpyear' style='text-decoration:underline'>"+d.getFullYear()+"</span>";
	} else {
		document.getElementById("jumpmonthheader").innerHTML = 
		"<span id='jumpmonth' style='text-decoration:underline'>"+monthnames[d.getMonth()]+"</span>"
		+" "+
		"<span id='jumpyear'>"+d.getFullYear()+"</span>";
	}
	
	return d;
}

function jumpMonthCalendar(step) {
	var d = new Date();
	if (step==0){
		todayview = 0;
		hoverdate = encodeDate(d);
		clickdate = encodeDate(d);
		update();
	} else todayview+=step;
	generateCalendar(schedule.orderedList,d.getMonth()+todayview);
}

function getDaySchedule(strdate, month) {
	// repetitiveTasks
	var date = decodeDate(strdate);
	var dayschedule = schedule.repetitiveTasks.concat([]);
	var dateend = new Date(date.getTime());
	dateend.setDate(date.getDate()+1);

	// expand exceptions
	for (task of dayschedule) {
    if (task.exceptions) 
      for (exception in task.exceptions) {
        dayschedule.push(task.exceptions[exception]);
      }
  }

	// extend repetitive tasks
	if (
		!month ||
		(month && settings["calendar-mode"].show_repetitive_tasks_on_month_preview)
	)
	for (var i = 0; i < dayschedule.length; i++) {
		var _task = dayschedule[i];
		var task = JSON.parse(JSON.stringify(_task));
		if (!task.repeat) continue;
		var began = decodeDate(task.repeat.began);
		var end;
		
		if (began.getTime()>date.getTime()) continue;
		if (task.repeat.end) {
			end = decodeDate(task.repeat.end);
			if (end.getTime()<date.getTime()) continue;
		}

		// if (schedule.tasksByDate[strdate])
		// 	if (schedule.tasksByDate[strdate].findIndex(function(obj) {
		// 		return obj.id == task.id
		// 	}) >= 0) break;

		switch (task.repeat.unit) {
			case "days":
				var begandays = (date.getTime()-began.getTime())/86400000;
		  	if (begandays%task.repeat.amount==0) {
		  		var time = new Date(task.timeid);
					time.setFullYear(
						began.getFullYear(),
						began.getMonth(),
						began.getDate()+begandays
					);
					task.timeid = time.getTime();
					task.date = encodeDate(time);
		  	}
		  break;
		  case "weeks":
		  	var beganweeks = (date.getTime()-began.getTime())/(86400000*7);
		  	if (beganweeks%task.repeat.amount==0) {
		  		var time = new Date(task.timeid);
					time.setFullYear(
						began.getFullYear(),
						began.getMonth(),
						began.getDate()+beganweeks*7
					);
					task.timeid = time.getTime();
					task.date = encodeDate(time);
		  	}
		  break;
		  case "months":
		  	var beganmonths = (date.getFullYear()-began.getFullYear())*12+(date.getMonth()-began.getMonth());
		  	
		  	if (beganmonths%task.repeat.amount==0) {
		  		if (
		  			date.getDate() != began.getDate() && 
		  			task.repeat.type == "sameday"
		  		) break;
		  		var time = new Date(task.timeid);
					time.setFullYear(
						began.getFullYear(),
						began.getMonth()+beganmonths,
						began.getDate()
					);
					if (task.repeat.type == "sameweekday") {
          	time.setDate(1);
        	  while (time.getDay()!=began.getDay()) {
        	    time.setDate(time.getDate()+1);
        	  }
        	  time.setDate(time.getDate()+7*(getWhichWeekDay(began)-1));
        	  if (
        	  	began.getDay() != date.getDay() ||
        	  	getWhichWeekDay(began) != getWhichWeekDay(date)
        	  ) break;
		  		}
        	task.timeid = time.getTime();
        	task.date = encodeDate(time);
		  	}
		  break;
		  case "years":
		  	var beganyears = date.getFullYear()-began.getFullYear();
		  	if (
		  		beganyears%task.repeat.amount==0 &&
		  		date.getMonth() == began.getMonth() && 
		  		date.getDate() == began.getDate()
		  	) {
					var time = new Date(task.timeid);
					time.setFullYear(
						began.getFullYear()+beganyears,
						began.getMonth(),
						began.getDate()
					);
					task.timeid = time.getTime();
					task.date = encodeDate(time);
		  	}
				break;
		}
		if (
      task.timeid != _task.timeid &&
      task.date == strdate
    ) {
      if (task.remind) {
        switch (task.remind.whenremind) {
          case "whendeadlineends":
            task.remind.reminddate = task.date;
            task.remind.remindtime = task.time;
            task.remind.timeid = task.timeid;
            break;
          case "5minsbefore":
            var time = task.timeid;
            var d;
            time -= 5*60*1000;
            d = new Date(time);

            task.remind.reminddate = encodeDate(d);
            task.remind.remindtime = encodeTime(d);
            task.remind.timeid = time;
            break;
          case "30minsbefore":
            var time = task.timeid;
            var d;
            time -= 30*60*1000;
            d = new Date(time);

            task.remind.reminddate = encodeDate(d);
            task.remind.remindtime = encodeTime(d);
            task.remind.timeid = time;
            break;
          case "1hourbefore":
            var time = task.timeid;
            var d;
            time -= 3600*1000;
            d = new Date(time);

            task.remind.reminddate = encodeDate(d);
            task.remind.remindtime = encodeTime(d);
            task.remind.timeid = time;
            break;
          case "1daybefore":
            var time = task.timeid;
            var d;
            time -= 24*3600*1000;
            d = new Date(time);

            task.remind.reminddate = encodeDate(d);
            task.remind.remindtime = encodeTime(d);
            task.remind.timeid = time;
            break;
          case "1weekbefore":
            var time = task.timeid;
            var d;
            time -= 7*24*3600*1000;
            d = new Date(time);

            task.remind.reminddate = encodeDate(d);
            task.remind.remindtime = encodeTime(d);
            task.remind.timeid = time;
            break;
        }
      }

      dayschedule.push(task);
    }
	}
	// orderedList
	dayschedule = dayschedule.concat(schedule.tasksByDate[strdate] || []);
	if (dayschedule[0] == undefined || !dayschedule) return [];

	//delete olddates
	dayschedule = dayschedule.filter(function(task,index) {
    if (task.exceptions) {
      var response = true;
      for (exception in task.exceptions) {
        if (task.exceptions[exception].date == task.date) response = false;
      }
      return response;
    } else return true
  });
	// deleting all misleading tasks
	for (var i = 0; i < dayschedule.length; i++) {
		if (dayschedule[i].date != strdate || dayschedule[i].hide) {
			dayschedule.splice(i,1);
			i--;
		} else if (dayschedule[i].repeat) {
			if (dayschedule[i].repeat.end)
				if (decodeDate(dayschedule[i].repeat.end).getTime()<decodeDate(strdate)) {
					dayschedule.splice(i,1);
					i--;
				}
		}
	}

	return (dayschedule || []);
}

function previewSchedule(strdate, clear, month) {
	var dayschedule = getDaySchedule(strdate, month);
	// clear
	if (!clear) 
		document.getElementById("preview").innerHTML = "\
		<div class=\"medium bar clickable\" id=\"addtaskbar\" title=\"Ctrl+N\" onclick=\"showForm('add',undefined,'"+strdate+"')\">\
				<div class=\"icon left\">📝</div>\
				<div class=\"context left\">\
					<div class=\"underline\">\
						Dodaj nowe zadanie\
					</div>\
				</div>\
				<div class=\"dropdown icon right\">+</div>\
			</div>";

	for (var i = 0; i < dayschedule.length; i++) {
		var today = new Date();
		(function(z) {
			var task = dayschedule[z];
			var today = new Date();

			var bar = document.createElement("div");
			bar.classList.add("medium");
			bar.classList.add("bar");
			if (task.color)
        bar.classList.add("color-"+task.color);
      else
        bar.classList.add("color-default");
			bar.classList.add("othertaskbar");

			var checkboxdiv = document.createElement("div");
			checkboxdiv.classList.add("left");

			var checkbox = document.createElement("input");
			checkbox.setAttribute("type","checkbox");
			checkbox.addEventListener('click', function(e) {
				var newdeadline = JSON.parse(JSON.stringify(task));
				var d = new Date();
				newdeadline.checked = (this.checked ? d.getTime() : false);
				newdeadline.lastcheck = (this.checked ? d.getTime() : newdeadline.lastcheck);
				updateTask(schedule.orderedList, task, newdeadline);
			});
			if (task.checked)
				checkbox.setAttribute("checked","checked");
			checkboxdiv.appendChild(checkbox);

			var context = document.createElement("div");
			context.classList.add("context");
			context.classList.add("left");
			context.classList.add("wordwrap");
			context.classList.add("clickable");
			context.classList.add("underline");
			if (task.checked)
				context.classList.add("strike");
			context.addEventListener('click', function(e) {
				showForm('show', task);
			});
			context.innerHTML = task.title;

			var datetext = document.createElement("div");
			datetext.classList.add("right");
			var d;
			if (!task.repeat) {
				d = new Date(task.timeid);
			} else if (!task.olddate) {
				datetext.innerHTML = "<span title='Zadanie cykliczne' style='font-size: 17px;'>🔁</span> ";
				d = new Date(task.timeid);
			} else {
				datetext.innerHTML = "<span title='Zadanie cykliczne' style='font-size: 17px;'>🔁</span> ";
				d = new Date(task.timeid);
				// d = decodeDate(task.olddate);
			}
			if (d.getDate() == today.getDate() && d.getMonth() == today.getMonth() && d.getFullYear() == today.getFullYear()) {
				datetext.innerHTML +=
					(d.getHours() < 10 ? "0"+d.getHours() : d.getHours())
						+":"+
					(d.getMinutes() < 10 ? "0"+d.getMinutes() : d.getMinutes())
			} else {
				datetext.innerHTML += d.getDate()+"."+(
					(d.getMonth()+1) < 10 ? "0"+(d.getMonth()+1) : (d.getMonth()+1)
				);
				if (today.getFullYear() != d.getFullYear()) {
					datetext.innerHTML += "<br>."+d.getFullYear();
				}
			}

			bar.appendChild(checkboxdiv);
			bar.appendChild(context);
			bar.appendChild(datetext);
			bar.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        // if (contextmenu) contextmenu.hide();
        contextmenu = new ContextMenu([
          {
            text:"Edytuj",
            icon:"📝",
            events: {
              click: function (e){
                showForm("edit",task);
              }
            }
          },
          {
            text:"Usuń",
            icon:"❌",
            events: {
              click: function (e){
                deleteTask(task);
              }
            }
          }
        ], {"close_on_click":true});
        contextmenu.display(event);
      });
			document.getElementById("preview").appendChild(bar);
		})(i);
	}
}

document.getElementById("jumpmonthheader").addEventListener("wheel", function(event) {
	var step = {
		"month":1,
		"year":12
	};
	if (event.deltaY > 0)
		jumpMonthCalendar(step[todayviewswitch.unit])
	else if (event.deltaY < 0)
		jumpMonthCalendar(-step[todayviewswitch.unit]);

	if (event.deltaX > 0)
		jumpMonthCalendar(step[todayviewswitch.unit])
	else if (event.deltaX < 0)
		jumpMonthCalendar(-step[todayviewswitch.unit]);

	var d = new Date();
	d.setFullYear(d.getFullYear(), d.getMonth()+todayview, 1);
	if (clickdate.split("-").length == 2) 
		clickdate = d.getFullYear()+"-"+(d.getMonth()+1);
	
	hoverdate = d.getFullYear()+"-"+(d.getMonth()+1);
	update(true);
});

document.getElementById("jumpmonthheader").addEventListener("mouseover", function(event) {
	var d = new Date();
	d.setFullYear(d.getFullYear(), d.getMonth()+todayview, 1);
	hoverdate = d.getFullYear()+"-"+(d.getMonth()+1);
	update(true);
});

document.getElementById("jumpmonthheader").addEventListener("mouseleave", function(event) {
	hoverdate = clickdate;
	update(true);
});

document.getElementById("jumpmonthheader").addEventListener("click", function(event) {
	todayviewswitch.timer = setTimeout(function() {
    if (!todayviewswitch.prevent) {
      var d = new Date();
			d.setFullYear(d.getFullYear(), d.getMonth()+todayview, 1);
			hoverdate = d.getFullYear()+"-"+(d.getMonth()+1);
			clickdate = d.getFullYear()+"-"+(d.getMonth()+1);
			// this.classList.add("clickeddate");
			update();
    }
    todayviewswitch.prevent = false;
  }, todayviewswitch.delay);
});

document.getElementById("jumpmonthheader").addEventListener("dblclick", function(event) {
	clearTimeout(todayviewswitch.timer);
   todayviewswitch.prevent = true;
	if (todayviewswitch.unit=="year") {
		todayviewswitch.unit = "month";
		update();
	} else {
		todayviewswitch.unit = "year";
		update();
	}
});

function previewMonthSchedule (strdate) {
	var d = decodeDate(strdate);
	var dend = new Date(d.getTime());
	dend.setMonth(d.getMonth()+1);
	previewSchedule(encodeDate(d), false, true);
	d.setDate(d.getDate()+1);
	while (d.getTime()<dend.getTime()) {
		previewSchedule(encodeDate(d), true, true);
		d.setDate(d.getDate()+1);
	}
}

Mousetrap.bind(["command+tab","ctrl+tab"], function(e) {
  showMode('list');
});
