/*
* PlanView Chrome Extension Library
*/

window.pv = window.pv ||
{
	getOption: function(option)
	{
		return localStorage.getItem(option);
	},
	updateOption: function(option,value,callback)
	{
		var current = localStorage.getItem(option);
		if(pv.containsDifference(current,value))
		{
			localStorage.setItem(option,value);
			chrome.storage.sync.set({option: value});
			pv.pushChange("UPDATE","pv.updateOption",current,value,{"format":"STRING","syncUpdated":true});
			return true;
		}
		else return false;
	},
	setOption: function(option,value)
	{
		return pv.updateOption(option,value);
	},
	pushChange: function(type,initiator,previous,current,otherInfo)
	{
		/*TODO:Add code to this. I have no idea how I'm going to implement it but it's supposed to basically serve as an undo*/
		console.log("Change received:",type,initiator,previous,current,otherInfo);
		return;
	},
	containsDifference: function(before, after)
	{
		return !(after === before)
	},
	init: function(otherInit)
	{
		/*Init functions*/
		pv.links.updateLinks();
		$(".button-collapse").sideNav();
		$(".class").off("click");
		$(".class").click(pv.links.events.click);
		$(".carousel").carousel({indicators:true});
		if(typeof otherInit === "string" && typeof pv["init_"+otherInit] === "function")
			pv["init_"+otherInit]();
		$("a.smoothscroll").click(function(e)
		{
			e.preventDefault();
			$('html, body').animate({
				scrollTop: $($(this).attr("href")).offset().top - 70
			}, 1000);
		});
		pv.names.events.updateAll();
	},
	init_settings: function()
	{
		$("#save-links").off("click");
		$("#save-emails").off("click");
		$("#save-names").off("click");
		$("#save-links").click(pv.links.events.saveAll);
		$("#save-emails").click(pv.emails.events.saveAll);
		$("#save-names").click(pv.names.events.saveAll);
		$("#autosave").change(function(){pv.updateOption("autosave",$(this).is(":checked")); Materialize.toast("Autosave settings updated!",1000);});
		for(var i = 1; i <=8; i++)
		{
			$("#block-"+i+"-link").val(pv.links.getBlock(i).replace(/#noLink/g,""));
			$("#block-"+i+"-email").val(pv.emails.getBlock(i).replace(/#noEmail/g,""));
			$("#block-"+i+"-name").val(pv.names.getBlock(i).replace(/<sup>/g,"").replace(/<\/sup>/g,""));
		}
		$("#calendar-save").off("click");
		$("#calendar-save").click(pv.calendar.events.settingsSave);
		$("#calendar").val(pv.calendar.getID());
	},
	init_notes: function()
	{
		if(localStorage.getItem("notes") == null)
			pv.notes.create();
		pv.notes.fillAll();
		pv.notes.addListeners(); //See $(".email").click(...) for why I implemented like this!

		if(localStorage.getItem("emails") == null)
			pv.emails.create();
		pv.emails.updateEmails();
		$(".email").click(pv.emails.events.click); //Why did I not create a function like I did for pv.notes.addListeners() to add listeners? Because Email has only one listener while notes have many more (ie focus)
		pv.calendar.pushCalendar("#calendar");
		$("clearNotes").click(pv.notes.create);
	},
	emails:
	{

		getBlock: function(block)
		{
			return JSON.parse(pv.getOption("emails"))[block];
		},
		updateBlock: function(block,email)
		{
			var current = JSON.parse(pv.getOption("emails")), previous = current[block];
			if(pv.containsDifference(previous,email))
			{
				current[block] = email;
				pv.updateOption("emails",JSON.stringify(current));
				pv.pushChange("UPDATE","email.updateBlock",previous,email,{"block":block,"format":"STRING"});
				return true;
			}
			return false;
		},
		setBlock: function(block,email)
		{
			return pv.emails.updateBlock(block,email);
		},
		resetEmails: function()
		{
			var del = JSON.parse(pv.getOption("emails"));
			for(toDel in del)
			{
				pv.emails.updateBlock(toDel,"");
			}
			pv.pushChange("RESET","email.resetEmails",del,JSON.parse(pv.getOption("emails")),{"format":"JSON"});
		},
		workabale: function(check)
		{
			return ((typeof check !== "undefined") && (check !== "") && (check !== null));
		},
		create: function()
		{
			var old = pv.getOption("emails");
			pv.updateOption("emails",'{"1":"#noEmail","2":"#noEmail","3":"#noEmail","4":"#noEmail","5":"#noEmail","6":"#noEmail","7":"#noEmail","8":"#noEmail"}');
			pv.pushChange("REBUILD","email.create",JSON.parse(old),JSON.parse(pv.getOption("emails")),{"format":"JSON"})
		},
		openEmail:function(email)
		{
			chrome.tabs.create({url:"mailto:"+email});
		},
		updateEmails: function(prefix,suffix)
		{
			prefix = prefix || "#block-";
			suffix = suffix || "-email";
			for(var i = 1 ; i <=8; i++)
			{
				var email = pv.emails.getBlock(i);
				$(prefix+i+suffix).attr("data-email",email);
				email = (email.indexOf("#") >= 0) ? "No email set!" : email;
				$(prefix+i+suffix).attr("title",email);
			}
		},
		events:
		{
			click:function(event)
			{
				var email = $(this).attr("data-email");
				email.replace(/mailto:/g,""); //Ensures that adding mailto won't make it mailto:mailto:example@hexr.org
				if(email.indexOf("#") == 0 || email == "")
				{
					event.preventDefault();
					$("#noEmail").openModal();
				}
				else pv.emails.openEmail(email);
			},
			saveAll: function(event)
			{
				event.preventDefault()
				for(var i = 1; i<=8; i++)
				{
					var email = $("#block-"+i+"-email").val();
					if(email == "" || email == null)
						email = "#noEmail";
					pv.emails.updateBlock(i,email);
				}
				Materialize.toast("Emails updated!",5000)
			}
		}
	},
	links:
	{
		getBlock: function(block)
		{
			return JSON.parse(pv.getOption("links"))[block];
		},
		updateBlock: function(block,link)
		{
			var current = JSON.parse(pv.getOption("links")), previous = current[block];
			if(pv.containsDifference(previous,link))
			{
				current[block] = link;
				if(link == "") link = "#noLink";
				pv.updateOption("links",JSON.stringify(current));
				pv.pushChange("UPDATE","links.updateBlock",previous,link,{"block":block,"format":"STRING"});
				return true;
			}
			return false;
		},
		setBlock: function(block,link)
		{
			return pv.links.updateBlock(block,link);
		},
		resetLinks: function()
		{
			var del = JSON.parse(pv.getOption("links"));
			for(toDel in del)
			{
				pv.links.updateBlock(toDel,"");
			}
			pv.pushChange("RESET","links.resetLinks",del,JSON.parse(pv.getOption("links")),{"format":"JSON"});
		},
		workabale: function(check)
		{
			return ((typeof check !== "undefined") && (check !== "") && (check !== null));
		},
		create: function()
		{
			var old = pv.getOption("links");
			pv.updateOption("links",'{"1":"#noLink","2":"#noLink","3":"#noLink","4":"#noLink","5":"#noLink","6":"#noLink","7":"#noLink","8":"#noLink"}');
			for(var i = 1; i <= 8; i++)
			{
				pv.links.setBlock(i,""); //Even though set is deprecated it's more definitive of what we're doing
			}
			pv.pushChange("REBUILD","links.create",JSON.parse(old),JSON.parse(pv.getOption("links")),{"format":"JSON"})
		},
		updateLinks: function(prefix,suffix)
		{
			prefix = prefix || "#block-";
			suffix = suffix || "-nav";
			for(var i = 1 ; i <=8; i++)
			{
				$(prefix+i+suffix).attr("data-location",pv.links.getBlock(i));
			}
		},
		events:
		{
			saveAll: function(event)
			{
				event.preventDefault()
				for(var i = 1; i<=8; i++)
				{
					var link = $("#block-"+i+"-link").val();
					if(link == "" || link == null)
						link = "#noLink";
					pv.links.updateBlock(i,link);
				}
				Materialize.toast("Links saved!",5000);
				pv.links.updateLinks()
			},
			click: function(event)
			{
				console.log($(this));
				link = $(this).attr("data-location");
				console.log(link);
				if(link.indexOf("#") == 0 || link == "")
					$("#noLink").openModal();
				else pv.links.open(link)
			}
		},
		open: function(what)
		{
			chrome.tabs.create({url:what});
		},
	},
	notes:
	{
		getBlock: function(block)
		{
			return JSON.parse(pv.getOption("notes"))[block];
		},
		updateBlock: function(block,note)
		{
			var current = JSON.parse(pv.getOption("notes")), previous = current[block];
			if(pv.containsDifference(previous,note))
			{
				current[block] = note;
				pv.updateOption("notes",JSON.stringify(current));
				pv.pushChange("UPDATE","notes.updateBlock",previous,note,{"block":block,"format":"STRING"});
				return true;
			}
			return false;
		},
		setBlock: function(block,note)
		{
			return pv.notes.updateBlock(block,note);
		},
		resetNotes: function()
		{
			var del = JSON.parse(pv.getOption("notes"));
			for(toDel in del)
			{
				pv.notes.updateBlock(toDel,"");
			}
			pv.pushChange("RESET","notes.resetNotes",del,JSON.parse(pv.getOption("notes")),{"format":"JSON"});
		},
		workabale: function(check)
		{
			return ((typeof check !== "undefined") && (check !== "") && (check !== null));
		},
		create: function()
		{
			var old = pv.getOption("notes");
			pv.updateOption("notes",'{"1":"","2":"","3":"","4":"","5":"","6":"","7":"","8":""}');
			pv.pushChange("REBUILD","notes.create",JSON.parse(old),JSON.parse(pv.getOption("notes")),{"format":"JSON"})
		},
		fillAll: function(prefix,suffix)
		{
			prefix = prefix || "#block-";
			suffix = suffix || "-notes";
			for(var i = 1; i <= 8; i++)
			{
				$(prefix+i+suffix).val(pv.notes.getBlock(i));
			}
		},
		addListeners: function()
		{
			$(".btn-save").off("click");
			$(".btn-save").click(pv.notes.events.save);
			if(pv.getOption("autosave") == "true")
			{
				$(".materialize-textarea").off("change");
				$(".materialize-textarea").off("focusout");
				$(".materialize-textarea").change(pv.notes.events.save);
				$(".materialize-textarea").focusout(pv.notes.events.save);
			}
		},
		events:
		{
			save: function()
			{
				var block = $(this).attr("data-block"), old = pv.notes.getBlock(block), nu = $("#block-"+block+"-notes").val(), buttonClicked  = $(this).hasClass("btn-save");
				if(!pv.containsDifference(old,nu))
				{
					if(buttonClicked)
						Materialize.toast("Nothing to do here!",500)
				}
				else
				{
					console.log(pv.notes.updateBlock(block,nu));
					pv.pushChange("UPDATE","pv.notes.events.save",old,nu,{"format":"STRING"});
					Materialize.toast("Block "+block+" updated!",2500);
				}
			},
		}
	},
	calendar:
	{
		generateFrame: function(width,height,frameborder,scrolling,id)
		{
			width = width || 600;
			height = height || 500;
			frameborder = frameborder || 0;
			scrolling = scrolling || 'no'
			id = id || pv.calendar.getID();
			if(id == null || id == "")
				return "<div class='error center red-text'><h3>Calendar not setup!</h3><p class='flow-text'>You might want to set this up in <a href='./settings.html#calendars' target='_blank'>settings</a>!</p></div>"
			return "<iframe src='https://calendar.google.com/calendar/embed?src="+id+"' style='border: 0' width='"+width+"' height='"+height+"' frameborder='"+frameborder+"' scrolling='"+scrolling+"'></iframe>"
		},
		getID: function()
		{
			return pv.getOption("calendar")
		},
		setID: function(nu)
		{
			var old = pv.calendar.getID();
			if(nu.indexOf("@") <= 0)
				nu = nu + "@gmail.com";
			pv.updateOption("calendar",nu);
			pv.pushChange("UPDATE", "pv.calendar.setID",old,nu,{"format":"STRING"});
		},
		pushCalendar: function(element)
		{
			$(element).html(pv.calendar.generateFrame());
		},
		events:
		{
			settingsSave: function(event)
			{
				event.preventDefault();
				pv.calendar.setID($("#calendar").val());
				Materialize.toast("Calendar ID saved!",1000);
			}
		}
	},
	names:
	{
		setBlock: function(block,name)
		{
			var names = JSON.parse(pv.getOption("names")), current = names[block];
			names[block] = name;
			pv.updateOption("names",JSON.stringify(names));
			pv.pushChange("UPDATE","names.setBlock",current,name,{"FORMAT":"STRING"});
		},
		getBlock: function(block)
		{
			return JSON.parse(pv.getOption("names"))[block];
		},
		create: function()
		{
			var old = pv.getOption("names");
			pv.updateOption("names",'{"1":"1<sup>st</sup> Block","2":"2<sup>nd</sup> Block","3":"3<sup>rd</sup> Block","4":"4<sup>th</sup> Block","5":"5<sup>th</sup> Block","6":"6<sup>th</sup> Block","7":"7<sup>th</sup> Block","8":"8<sup>th</sup> Block"}');
			pv.pushChange("REBUILD","names.create",JSON.parse(old),JSON.parse(pv.getOption("names")),{"format":"JSON"})
		},
		events:
		{
			updateAll: function()
			{
				for(var i = 1; i <= 8; i++)
				{
					var name = pv.names.getBlock(i);
					$("#block-"+i+"-nav").html('<i class="material-icons right">web</i>' + name);
					$("#block-"+i+" #title-name").html(name);
				}
			},
			saveAll:function(event)
			{
				event.preventDefault()
				for(var i = 1; i<=8; i++)
				{
					var name = $("#block-"+i+"-name").val();
					if(!(name == "" || name == null))
					{
						pv.names.setBlock(i,name);
					}
				}
				pv.names.events.updateAll();
				Materialize.toast("Block Names updated!",2500);
			}
		}
	},
	settings:
	{
		import: function(data)
		{
			//var requirements = ['autosave','initialized','emails','links','names','calendar','notes'],
			var requirements = [{name:'autosave',type:'boolean'},
			{name:'initialized',type:'boolean'},
			{name:'emails',type:'object'},
			{name:'links',type:'object'},
			{name:'names',type:'object'},
			{name:'calendar',type:'string'},
			{name:'notes',type:'object'}]
			,
			log = "", create = [];
			for(requirement in requirements)
			{
				if(data[requirement.name] == null || data[requirement.name] == "undefined")
				{
					log += "Unable to import:" + requirement;
					create.push(requirement);
				}
			}
		},
		export: function(){}
	},
	firstRun: function()
	{
		pv.links.create();
		pv.emails.create();
		pv.notes.create();
		pv.names.create();
		pv.updateOption("autosave",false);
		pv.updateOption("initialized",true);
	}
};
if(!(pv.getOption("initialized") === "true")) pv.firstRun();
