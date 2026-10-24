
	var pys_datalayer_name = "dataLayer";
	window["dataLayer"] = window["dataLayer"] || [];
	(function(){var l=window["dataLayer"],i;
	for(i=l.length;i--;){if(l[i]){if(l[i][0]==="consent"){if(l[i][1]==="default"){return;}}}}
	var c=function(){l.push(arguments);};
	c("consent","default",{"analytics_storage":"denied","ad_storage":"denied","ad_user_data":"denied","ad_personalization":"denied","wait_for_update":500});})();