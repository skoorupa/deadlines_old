const ipc = require("electron").ipcRenderer;

(function(){
	const remote = require('electron').remote;
	document.getElementById("version").innerHTML = "Deadlines v." + remote.app.getVersion();

	document.querySelectorAll("#menu li").forEach(function(obj) {
		obj.addEventListener("click", function(event) {
			for (var i = 0; i < document.getElementById("context").children.length; i++) {
				document.getElementById("context").children[i].style.display="none"
			}
			document.getElementById(this.getAttribute("data-value")).style.display = "block";
			document.querySelectorAll("#menu li").forEach(function(o) {o.classList.remove("selected")});
			this.classList.add("selected");
		});
	});

	var usersettings = ipc.sendSync("getsettings");
	for (category in usersettings) {
		for (setting in usersettings[category]) {
			var input = document.getElementsByName(setting)[0];
			if (!input) continue;
			if (input.getAttribute("type")=="checkbox")
				input.checked = usersettings[category][setting];
			else
				input.value = usersettings[category][setting];
		}
	}

	document.querySelectorAll("label > input[type=checkbox]").forEach(function(obj) {
	  function toggle(checkbox) {
	    console.log(checkbox);
	    var labels = checkbox.parentNode.querySelectorAll("label");
	    var directchildren = checkbox.parentNode.children;
	    labels.forEach( function(label) {
	      if (
	        label.getAttribute("data-checked") == String(checkbox.checked) &&
	        [...directchildren].indexOf(label) != -1
	      )
	        label.style.display = "block";
	      else if (
	        label.getAttribute("data-checked") != String(checkbox.checked) &&
	        [...directchildren].indexOf(label) != -1
	      )
	        label.style.display = "none";
	    });
	  }

	  toggle(obj);
	  obj.addEventListener("change", (e)=>{toggle(e.target)});
	});
})();

function updateSettings(settings_id) {
	var elems = document.getElementById(settings_id).elements;
	var settings = {};

	for (var i = 0; i < elems.length; i++) 
		if (elems[i].type=="checkbox")
			settings[elems[i].name] = elems[i].checked;
		else
			settings[elems[i].name] = elems[i].value;
	
	ipc.send("updatesettings",settings_id, JSON.stringify(settings));
}