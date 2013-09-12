
/* ------------------------------------------------------------------------------------------------------------------------------------------------ */
/*         STORELOCATOR                                                               */
/* ------------------------------------------------------------------------------------------------------------------------------------------------ */
var Salespoints = {
    init: function () {

        $('body').removeClass('corpo').addClass('storeLocator');
        var params = document.location.href.split('storeid=');
        if (params.length > 1) {
            params = params[1].split('&');
            var storeid = params[0];
        }

        var params = document.location.href.split('displayStoreMsg=');
        if (params.length > 1) {
            params = params[1].split('&');
            var displayStoreMsg = params[0];
        }
        if (displayStoreMsg) {
            setTimeout(function () { DisplayAddStore(displayStoreMsg, ''); }, 500);
        }

        if (storeid) Salespoints.storeFocus(storeid, storesFile);
        else Salespoints.buildShopLists(storesFile);

        resetInput($('#mapSearch'));

    },
    getDistance: function (lat1, lon1, lat2, lon2) {

        var R = 6371; // km
        var toRad = Math.PI / 180;

        var dLat = (lat2 - lat1) * toRad;
        var dLon = (lon2 - lon1) * toRad;
        lat1 = lat1 * toRad;
        lat2 = lat2 * toRad;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var distance = Math.round(R * c * 100) / 100;

        return distance;
    },
    buildShopLists: function (file) {

        // getting data
        $.ajax({
            url: file,
            dataType: 'json',
            complete: function (data, e) {

                var shops = $(data.responseXML);

                var boutiques = Salespoints.toShopList(shops.find('stores store'));
                if (boutiques.length > 0) Salespoints.buildMap(boutiques);

                var availableTags = Salespoints.toTagList(shops.find('stores store'));
                Salespoints.search(availableTags, file);

            }
        });


    },
    toShopList: function (tree, request, boutiques) {

        var address = '';
        var obj, name, street, complement, zip, city, country, lat, lon, coords, phoneLabel, phoneNumber, phone, scheduleLabel, scheduleTime, schedule, latRequest, lonRequest, comments, deliveryService, storeId;
        var distance;
        var tb_boutiques = [], focus = [], tb_distance = [], tb_address = [];
        if (request) requestMatch = '---' + request.toLowerCase() + '---';

        $(tree).each(function (i) {
            obj = $(this);
            name = obj.find('name').text();
            street = obj.find('street').text();
            complement = obj.find('complement').text();
            complement = complement.replace(/\\n/g, '<br/>');
            if (complement) complement += '<br/>';
            zip = obj.find('zip').text();
            city = obj.find('city').text();
            country = obj.find('country').text();
            lat = obj.find('lat').text();
            lon = obj.find('lon').text();
            phoneLabel = obj.find('phoneLabel').text();
            phoneNumber = obj.find('phoneNumber').text();
            if (phoneNumber) phone = '<p class="phone"><span>' + phoneLabel + '</span>' + phoneNumber + '</p>';
            else phone = '';
            scheduleLabel = obj.find('scheduleLabel').text();
            scheduleTime = obj.find('scheduleTime').text();
            scheduleTime = scheduleTime.replace(/\\n/g, '<br/>');
            scheduleTime = scheduleTime.replace(/\[/g, '<span>');
            scheduleTime = scheduleTime.replace(/\]/g, '</span>');
            if (scheduleTime) schedule = '<p class="schedule"><span class="scheduleLabel">' + scheduleLabel + '</span>' + scheduleTime + '</p>';
            else schedule = '';
            comments = obj.find('comments').text();
            comments = '<p class="comments">' + comments.replace(/\\n/g, '<br/>') + '</p>';
            deliveryService = obj.find('deliveryService').text();
            storeId = obj.find('storeId').text();
            if (deliveryService == 'enabled') {
                if (addedStores == null)
                    delivery = '<a href="#addStoreNotLogged" class="fancy add arrow" storeid="' + storeId + '">Ajouter à mes boutiques</a>';
                else if (addedStores.split(',').length >= 6) {
                    delivery = '<p class="alert">Vous avez atteint le maximum autorisé pour le carnet d’adresses de boutiques.Pour ajouter une nouvelle boutique, supprimez dans <a href="/fr/profiles/signed/myStores.aspx">votre compte</a> au moins une adresse pour pouvoir en sélectionner une nouvelle.</p>'
                }
                else if (addedStores.indexOf(storeId) != -1)
                    delivery = '<p class="alert">Cette boutique fait déjà partie de votre liste</p>';
                else {
                    delivery = '<a href="javascript:;" onclick="javascript:AddStore(\'' + storeId + '\',{url:\'' + document.location.href.split('?')[0] + '?storeid=' + storeId + '&displayStoreMsg=0La boutique a été ajoutée.' + '\'});" class="add arrow" storeid="' + storeId + '">Ajouter à mes boutiques</a>';
                }
            }
            else
                delivery = '<p class="alert disabled">La livraison gratuite en boutique n’est pas encore disponible</p>';

            address = '<div class="shop"><div class="focusOn"><address><strong>Boutique ' + name + '</strong>' + street + '<br />' + complement + zip + ' ' + city + '</br>' + country + '</address>' + phone + schedule + '</div>' + comments + delivery + '<input type="hidden" class="lat" value="' + lat + '"/><input type="hidden" class="lon" value="' + lon + '"/></div>';
            tb_boutiques.push(address + '||' + lat + '||' + lon);

            if (request) {

                zip = '---' + zip + '---';
                city = '---' + city.toLowerCase() + '---';
                storeId = '---' + storeId + '---';

                if (zip.match('---' + request) || city.match(requestMatch) || requestMatch == storeId) {
                    focus.push(address + '||' + lat + '||' + lon);
                }
            }
        });

        if (request) {
            if (focus.length == 0) {
                if (document.location.href.match(/storeid/)) request = '';
                $('.googleMapError').remove();
                // Appel au service de geocodage avec l'adresse en paramètre

                var geocoderRequest = request;
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({ 'address': geocoderRequest, 'region': 'fr' }, function (results, status) {
                    // Si l'adresse a pu être géolocalisée
                    if (status == google.maps.GeocoderStatus.OK) {
                        // Récupération de sa latitude et de sa longitude
                        latRequest = results[0].geometry.location.lat();
                        lonRequest = results[0].geometry.location.lng();

                        for (var i = 0; i < tb_boutiques.length; i++) {
                            var boutiqueInfos = tb_boutiques[i].split('||');
                            var address = boutiqueInfos[0];
                            var lat2 = boutiqueInfos[1];
                            var lon2 = boutiqueInfos[2];

                            distance = Salespoints.getDistance(latRequest, lonRequest, lat2, lon2);

                            tb_address[distance] = address + '||' + lat2 + '||' + lon2;
                            tb_distance.push(distance);
                        }

                        tb_distance.sort(function (a, b) { return a - b });
                        for (var i = 0; i < 3; i++) {
                            distance = tb_distance[i];
                            focus.push(tb_address[distance]);
                        }

                        Salespoints.buildMap(boutiques, focus);

                        if ($('.shopList .shop')[0]) {
                            $('.shopList .shop .focusOn').click(function () {
                                var focus = [];
                                focus.push($(this).html() + '||' + $(this).siblings('.lat').val() + '||' + $(this).siblings('.lon').val());
                                Salespoints.buildMap(boutiques, focus, 'zoom');
                            });
                        }
                    }
                    else {
                        if (!$('.googleMapError')[0]) $('<p class="googleMapError error"><br/><br/>La localisation n\'a pu être effectuée pour la raison suivante: ' + status + '</p>').insertAfter('#googleMap fieldset');
                    }
                });

            }
            else {
                return focus;
            }
        }
        else return tb_boutiques;

    },
    toTagList: function (tree) {
        var obj, zip, city, keywords = '---,---';

        $(tree).each(function (i) {
            obj = $(this);
            zip = '---' + obj.find('zip').text() + '---';
            city = '---' + obj.find('city').text() + '---';

            if (!keywords.match(zip)) keywords += zip + ',';
            if (!keywords.match(city)) keywords += city + ',';
        });

        var availableTags = keywords.split('---,---');
        return availableTags;
    },
    buildMap: function (boutiques, focus, open) {

        // init (position zoom France)
        var position = new google.maps.LatLng(46.754917, 3.339844);

        var myOptions = {
            zoom: 5,
            center: position,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

        // Création des marqueurs
        var marker = [], infowindow = [];
        var j = boutiques.length;
        for (var i = 0; i < boutiques.length; i++) {

            var parameters = boutiques[i].split('||');
            var address = parameters[0];
            var lat = parameters[1];
            var lon = parameters[2];

            marker[i] = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lon),
                map: map
            });

            marker[i].setIcon('picto_marker.png');


            contentString = address;
            infowindow[i] = new google.maps.InfoWindow({
                content: contentString
            });

            clicMarker(i, j);
        }

        function clicMarker(a, b) {
            google.maps.event.addListener(marker[a], 'click', function () {
                for (var i = 0; i < b; i++) {
                    infowindow[i].close(map, marker[i]);
                }
                infowindow[a].open(map, marker[a]);
                $('.storeLocator .fancy').fancybox({
                    'overlayColor': '#000',
                    'overlayOpacity': 0.7,
                    'padding': 0,
                    'scrolling': 'no',
                    'speedIn': 250,
                    'speedOut': 250,
          'hideOnOverlayClick': false,
                    'titleShow': false,
                    'onStart': Popins.load,
                    'onComplete': Popins.setup,
                    'onClosed': Popins.close
                }).click(function () {
                    if ($(this).attr('storeid')) {
                        $('#fancybox-content').attr('storeid', $(this).attr('storeid'));
                        queryStoreid = $(this).attr('storeid');
                    }
                });
            });
        }

        if (focus) {
            var points = [];
            var bounds = new google.maps.LatLngBounds();
            if (open != "zoom") {
                $('.shopList').remove();
                $('<div class="shopList"/>').appendTo('#googleMap');
            }
            for (var i = 0; i < focus.length; i++) {
                var coords = focus[i].split('||');
                points.push(new google.maps.LatLng(coords[1], coords[2]));
                bounds.extend(points[i]);

                if (open != "zoom") $('.shopList').append(coords[0]);
            }
            $('.shopList').jScrollPane({
                showArrows: true,
                arrowButtonSpeed: 72,
                mouseWheelSpeed: 72
            });
            map.fitBounds(bounds);

            $('.storeLocator .fancy').fancybox({
                'overlayColor': '#000',
                'overlayOpacity': 0.7,
                'padding': 0,
                'scrolling': 'no',
                'speedIn': 250,
                'speedOut': 250,
        'hideOnOverlayClick': false,
                'titleShow': false,
                'onStart': Popins.load,
                'onComplete': Popins.setup,
                'onClosed': Popins.close
            }).click(function () {
                if ($(this).attr('storeid')) {
                    $('#fancybox-content').attr('storeid', $(this).attr('storeid'));
                    queryStoreid = $(this).attr('storeid');
                }
            });


        }

    },
    search: function (availableTags, file) {

        $("#mapSearch").autocomplete({
            source: availableTags,
            appendTo: "#googleMap fieldset",
            minLength: 2
        }).focus(function () {
            $(document).bind('keydown', function (e) {
                var target = e.which;
                if (target == 13) {
                    e.preventDefault();
                    $('.focusOnMap').triggerHandler('click');
                    e.stopPropagation();
                }
            });
        });

        var defaultValue = $('#mapSearch').val();

        $('.focusOnMap').click(function () {
            var request = $('#mapSearch').val();
            if (request && request != defaultValue) {
                // getting data

                $.ajax({
                    url: file,
                    dataType: 'json',
                    complete: function (data) {
                        var shops = $(data.responseXML);
                        var boutiques = Salespoints.toShopList(shops.find('stores store'));
                        var focus = Salespoints.toShopList(shops.find('stores store'), request, boutiques);
                        Salespoints.buildMap(boutiques, focus);

                        if ($('.shopList .shop')[0]) {
                            $('.shopList .shop .focusOn').click(function () {
                                var focus = [];
                                focus.push($(this).html() + '||' + $(this).siblings('.lat').val() + '||' + $(this).siblings('.lon').val());
                                Salespoints.buildMap(boutiques, focus, 'zoom');
                            });
                        }
                    }
                });
            }
        });

    },
    storeFocus: function (storeid, file) {

        $.ajax({
            url: file,
            dataType: 'json',
            complete: function (data) {
                var shops = $(data.responseXML);
                var boutiques = Salespoints.toShopList(shops.find('stores store'));
                var focus = Salespoints.toShopList(shops.find('stores store'), storeid, boutiques);
                Salespoints.buildMap(boutiques, focus);

                if ($('.shopList .shop')[0]) {
                    $('.shopList .shop .focusOn').click(function () {
                        var focus = [];
                        focus.push($(this).html() + '||' + $(this).siblings('.lat').val() + '||' + $(this).siblings('.lon').val());
                        Salespoints.buildMap(boutiques, focus, 'zoom');
                    });
                    $('.shopList .shop .focusOn').trigger('click');
                }

                var availableTags = Salespoints.toTagList(shops.find('stores store'));
                Salespoints.search(availableTags, file);

            }
        });

    },
    popin: function () {

        var storeid = $('#fancybox-content').attr('storeid');

        if (storeid) Salespoints.storeFocus(storeid, storesFile);
        else Salespoints.buildShopLists(storesFile);

        resetInput($('#mapSearch'));

    }
}


function resetInput(obj) {
  var searchDefaultValue = obj.val();
  obj.focus(function() {
    if($(this).val() == searchDefaultValue) $(this).val('');
  });
  obj.blur(function() {
    if($(this).val() == searchDefaultValue || $(this).val() == '')  $(this).val(searchDefaultValue);
  });
}
function DisplayAddStore(response, moreData)
{
  var isError = false;

  var code = response.substring(0,1);
  response = response.substring(1,2) + unescape(response.substring(2));

  if (code != '0')
      isError = true;

  if (!isError && moreData.url != null && moreData.url != '') {
      if (moreData.url == 'refresh' || moreData.url.indexOf('checkout/signed/delivery.aspx') > 1) {
          RefreshPanel('mainUpdatePanel');
          ShowMessagePopin(response, isError);
      }
      else
          document.location.href = moreData.url;
  }
  else {
      ShowMessagePopin(response, isError);
  }
}
function ShowMessagePopin(content, isError)
{
  var popinContent = jQuery('#messagePopin .popinContent span:eq(0)');

  if (popinContent != null)
  {
    popinContent.parent().removeClass('error');

    popinContent.html('');
      popinContent.append(content);

    if (isError)
      popinContent.parent().addClass('error');

    jQuery('#messagePopinLink').triggerHandler('click');
  }
}



var addedStores = null;

var storesFile = 'stores.xml';
// STORE
  if($('#map_canvas')[0]) {
    if(!$('.checkout')[0]) Salespoints.init();
    // else Salespoints.popin();
  }
