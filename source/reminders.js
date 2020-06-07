var reminders = [];
var win = remote.getCurrentWindow();
var overview = document.getElementById("overview");

function updateSize() {
	win.setSize(500, overview.offsetHeight+50);
}

ipc.on("reminders", function(event, content) {
	reminders = JSON.parse(content);
	console.log(reminders);

	function createOption (title,value,placeholder) {
		var option = document.createElement("option");
		option.value = value;
		option.textContent = title;
		if (placeholder) {
			option.setAttribute("disabled","disabled");
			option.setAttribute("selected","selected");
		}
		return option;
	}

	for (reminder of reminders) {
		var box = document.createElement("div");

		var bar = document.createElement("div");
		bar.classList.add("big","bar","reminderbar");
		// bar.setAttribute("onclick","toggleOverviewList(this)");

			var icon = document.createElement("div");
			icon.classList.add("icon","left");
			icon.textContent = "🔔";
			bar.appendChild(icon);
	
			var context = document.createElement("div");
			context.classList.add("context","left");
	
				var header = document.createElement("div");
				header.textContent = reminder.title;
				header.classList.add("clickable");
				header.addEventListener("click", function(event) {
						toggleOverviewList(bar);
				});
				context.appendChild(header);

				var subtitle = document.createElement("div");
				subtitle.classList.add("description","wordwrap","right");
				subtitle.style.display = "block";

					var button1 = document.createElement("button");
					button1.classList.add("clickable");
					button1.addEventListener("click", function(event) {
						reminder.checked = true;
						reminder.remind = undefined;
						ipc.send("edittask", JSON.stringify(reminder), 1);
						event.target.parentNode.parentNode.parentNode.parentNode.remove();

						var index = reminders.findIndex(function(item) {
          		return item.path.length === reminder.path.length && item.path.every((value, index) => value === reminder.path[index]);
       			});
       			reminders.splice(index,1);

       			if (!reminders.length) win.close();
					});
					button1.textContent = "Zrobione";
					subtitle.appendChild(button1);

					var button2 = document.createElement("select");
					button2.appendChild(createOption("Odłóz","",true));
					button2.appendChild(createOption("już nie przypominaj","dontremind"));
					button2.appendChild(createOption("za 5 minut","5"));
					button2.appendChild(createOption("za 10 minut","10"));
					button2.appendChild(createOption("za 30 minut","30"));
					button2.appendChild(createOption("za godzinę","60"));
					button2.appendChild(createOption("jutro","3600"));
					
					button2.addEventListener("change", function(event) {
						var now = new Date();
						reminder.remind.opened = false;
						reminder.remind.whenremind = "custom";
						if (event.target.value == "dontremind")
							reminder.remind = undefined;
						else {
							var time = Number(event.target.value)*1000*60;
							var timeid = now.getTime()+time;
							var d = new Date(timeid);

							reminder.remind.timeid = timeid;
							reminder.remind.reminddate = encodeDate(d);
							reminder.remind.remindtime = encodeTime(d);
							console.log(d);
							console.log(reminder);
						}

						ipc.send("edittask", JSON.stringify(reminder), 1);
						event.target.parentNode.parentNode.parentNode.parentNode.remove();

						var index = reminders.findIndex(function(item) {
          		return item.path.length === reminder.path.length && item.path.every((value, index) => value === reminder.path[index]);
       			});
       			reminders.splice(index,1);

       			if (!reminders.length) win.close();
					});

					button2.addEventListener("click", function(event) {event.preventDefault()});
					subtitle.appendChild(button2);

				context.appendChild(subtitle);

			bar.appendChild(context);
	
			var dropdown = document.createElement("div");
			dropdown.classList.add("dropdown","icon","right");
			dropdown.textContent = "∧";
			bar.appendChild(dropdown);

			box.appendChild(bar);

		var list = document.createElement("div");
		list.classList.add("list","reminderlist");
		list.style.display = "none";

			// var title = document.createElement("h1");
			// title.classList.add("title");
			// title.textContent = reminder.title;
			// list.appendChild(title);

			if (reminder.description) {
				var description = document.createElement("textarea");
				description.readonly = true;
				description.textContent = reminder.description;
				list.appendChild(description);
			}

			var l1 = document.createElement("label");
			l1.textContent = "📅: ";
				var date = document.createElement("span");
				date.classList.add("date");
				date.textContent = reminder.date;
				l1.appendChild(date);
			l1.innerHTML += "<br>";
			list.appendChild(l1);

			var l2 = document.createElement("label");
			l2.textContent = "🕓: ";
				var time = document.createElement("span");
				time.classList.add("time");
				time.textContent = reminder.time;
				l2.appendChild(time);
			l2.innerHTML += "<br>";
			list.appendChild(l2);

			if (reminder.repeat) {
				var repeatbox = document.createElement("label");
				repeatbox.classList.add("repeatbox","nomargin");
				repeatbox.style.display = 'inline';
				repeatbox.textContent = "🔁: ";
					var repeatamount = document.createElement("span");
					repeatamount.classList.add("repeatamount");
	      	var clarifyrepeat = document.createElement("span");
	      	clarifyrepeat.classList.add("clarifyrepeat");
					var weekdays = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
		      var amount = (reminder.repeat.amount==1)?"":reminder.repeat.amount+".";
		      var units = {
		        days: "dzień",
		        weeks: "tydzień",
		        months: "miesiąc",
		        years: "rok"
		      };
		      repeatamount.textContent = "co " + amount + " " + units[reminder.repeat.unit];
		      if (reminder.repeat.unit == "months") {
		        clarifyrepeat.style.display = "inline";
		        clarifyrepeat.textContent = "💭";
		        if(reminder.repeat.type == "sameday")
		          clarifyrepeat += d.getDate()+ ". dzień każdego miesiąca\n";
		        else {
		          var nweekday = getWhichWeekDay(d);
		          elems["clarifyrepeat"].title += nweekday+ ". "+weekdays[d.getDay()]+" każdego miesiąca\n";
		        }
		      } 
		      if (reminder.repeat.end) {
		        clarifyrepeat.style.display = "inline";
		        clarifyrepeat.textContent = "💭";
		        enddate = decodeDate(reminder.repeat.end);
		        var dates = {
		          year:""+enddate.getFullYear(),
		          month:""+(enddate.getMonth()+1),
		          day:""+enddate.getDate()
		        };
		        var c = ["month","day"];
		        for (var i = 0; i < c.length; i++)
		          if ( (""+dates[ c[i] ]).length < 2) dates[c[i]] = "0"+dates[c[i]];
		        clarifyrepeat.title += "Koniec zadania: "+dates.day + "/" + dates.month + "/" + dates.year;
			    }
			    repeatbox.appendChild(repeatamount);
			    repeatbox.appendChild(clarifyrepeat);
				list.appendChild(repeatbox);
			}
		box.appendChild(list);
		overview.appendChild(box);
	}

	updateSize();
});

function toggleOverviewList(bar) {
  if (bar.parentNode.getElementsByClassName("list")[0].style.display=="none") {
    // bar.getElementsByClassName("description")[0].style.display = "none";
    bar.getElementsByClassName("dropdown")[0].innerHTML = "∨";
    bar.parentNode.getElementsByClassName("list")[0].style.display = "block";
  } else {
    // bar.getElementsByClassName("description")[0].style.display = "block";
    bar.getElementsByClassName("dropdown")[0].innerHTML = "∧";
    bar.parentNode.getElementsByClassName("list")[0].style.display = "none";
  }
  updateSize();
}
