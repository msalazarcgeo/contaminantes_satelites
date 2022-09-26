///To run the script you have to load the table with the stations


///get the collection 
var AOD_MODIS =  ee.ImageCollection("MODIS/006/MCD19A2_GRANULES");
/// Get only the ones that are inside Mexico
var pol_mexico = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Mexico'));
////Filter the images from a specific date and 
// use the mexico polygon to filter the images 
var dataset_day =  AOD_MODIS.filter(ee.Filter.date('2021-08-01', '2021-08-10'))
.filterBounds(pol_mexico);

////get the range of dates 
var range = dataset_day.reduceColumns(ee.Reducer.minMax(), ['system:time_end']);
print('Date range: ', ee.Date(range.get('min')),ee.Date(range.get('max')) );

///Obtain a list of the desire properties of the image
var prop = 'system:time_end';
var time_list= dataset_day.aggregate_array(prop);
print('List with the end date of the image: ', time_list);

//// A function to obtain the value of the hour from the timestamp 
var gethourday = function(timestamp) {
  var hours=ee.Date(timestamp).get('hour');
  return hours;
};
// Apply the function to the list 
var list_hour= time_list.map(gethourday);
print('The list with the hour: ', list_hour);
// get the mean of the hour
var mean_hour = list_hour.reduce( ee.Reducer.mean());
print('Mean hour: ',mean_hour);

///// Select and use AOD


//Select the AOD and get the mean value of it. 

var AOD= dataset_day.select('Optical_Depth_047').mean();
var visParams= {bands:['Optical_Depth_047'],  // "Blue"],
                min: 0,
                max: 500.0,
                palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};
/// Esta capa es el promedio de el mes de enero de AOD para mexico 
//Map.addLayer(AOD, visParams, 'Optical Depth 047');

///// Vamos a tomar solo los que nos interesa los que esten en 
// un horario de 1 a 4 en horario local 

var first_im = dataset_day.first()
print(first_im.get('system:time_end'))


//// A function to obtain the value of the hour from the timestamp and add the time as property  
function add_hour(img){
    var date  = ee.Date(img.get('system:time_start'));
    var hour_day = date.get('hour');
    return img.set('hour_day', hour_day);
}

var gethourday_fe = function(timestamp) {
  var hours=ee.Date(timestamp).get('hour');
  return ee.Feature(hours);
};

/// apply the function 
var data_set_hour = dataset_day.map(add_hour);
/// filter the images greather or equal  than 18 hours 1pm in CDMX 
var data_set_filter_hour = data_set_hour.filter(ee.Filter.gte('hour_day', 18));
print('Mayores a 18:', data_set_filter_hour)
/// filter less or equal than 21 
var data_set_filter_hour = data_set_filter_hour.filter(ee.Filter.lte('hour_day', 21));
print(data_set_filter_hour);

var AOD= data_set_filter_hour.select('Optical_Depth_047').mean();
var visParams= {bands:['Optical_Depth_047'],  // "Blue"],
                min: 0,
                max: 500.0,
                palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};
//print(AOD)
//Map.addLayer(AOD, visParams, 'Optical Depth 047');
var estaciones_table = ee.FeatureCollection("users/msalazar_cgeo/estaciones");

print('Estaciones:', estaciones_table);

Map.addLayer(estaciones_table, {color: 'orange'}, 'Estaciones');

// se queda solo con el segmento de satelite que contiene a los puntos

//var segmento_contiene = dataset_day.filterBounds(estaciones_table.geometry());
///Con aquellas que se encuentran dentro de las horas definidas 
var segmento_contiene = data_set_filter_hour.filterBounds(estaciones_table.geometry());
print('Las imagenes que tienen a las estaciones dentro:', segmento_contiene);
//Imprime segmento  y visualiza el segmento
//print('Segmento: ',segmento_contiene)
//// Ayadir la capa al mapa
//Map.addLayer(segmento_contiene.first().select('Optical_Depth_047'),visParams ,'Optical Depth 047');

var valores = segmento_contiene.first().reduceRegions({
  collection: estaciones_table,
  reducer:ee.Reducer.first(),
  crs:ee.Projection('EPSG:4326'),
  scale:30,
})
print('Valores en primera imagen:', valores)
var geometry_points = estaciones_table.geometry();
///// funcion para obtener el valor del raster donde se encuentran los puntos en la imagen
var get_valores= function(image_s) {
  var stats = image_s.reduceRegion({
      geometry: geometry_points,
      scale: 30,
      reducer: ee.Reducer.first()});
  return ee.Feature(geometry_points, {
      AOD_Uncertainty: stats.get('AOD_Uncertainty'),
      Optical_Depth_047: stats.get('Optical_Depth_047'),
      hourStart: image_s.get('system:time_start'),
      hourEnd : image_s.get('system:time_end'),
      date: image_s.get('system:index'),
      });
};
////No se usa pero sirve como ejemplo 
//var altitud= get_valores(segmento_contiene.first()).flatten();//.select('features').select('features')
//print(altitud);

print(segmento_contiene.first().reduceRegion({
      geometry: estaciones_table.first().geometry(),
      scale: 30,
      reducer: ee.Reducer.first()
})
);

///Obtener los valores de AOD en las estciones usando la primera imagen
var val_puntos_image_0= function(estacion){
  var val_aod_punto = segmento_contiene.first().reduceRegion({
    geometry:estacion.geometry(),
    scale:30,
    reducer: ee.Reducer.first()
});
  return ee.Feature(estacion.geometry(), 
   {
      id:estacion.get('Estacion'),
      Optical_Depth_047 : val_aod_punto.get('Optical_Depth_047'),
      AOD_Uncertainty: val_aod_punto.get('AOD_Uncertainty'),
   }
  );
};


//// Probar la funcion usando la  primera imagen  y la tabla de las estacions
var esta_red = estaciones_table.map(val_puntos_image_0); 
print('Esta red: ',esta_red);

var multiProp = esta_red.select({
  propertySelectors: ['Optical_Depth_047', 'AOD_Uncertainty'],
});
print('En esta red: ', esta_red.select(['id',
                              'Optical_Depth_047',
                              'AOD_Uncertainty' 
                              ])
);


/////Vamos hacer la funcion para poder applycarla sobre la colleccion de imagenes,
// es decir la intencion es que a cada imagen se obtenga los valores de 

var val_puntos_collection= function(imagen){
  var val_puntos_img= function(estacion){
    
    var val_aod_punto = imagen.reduceRegion({
      geometry: estacion.geometry(),
      scale:30,
      reducer: ee.Reducer.first()
    });
    
    return ee.Feature(estacion.geometry(), 
      {
        id:estacion.get('Estacion'),
        Optical_Depth_047 : val_aod_punto.get('Optical_Depth_047'),
        AOD_Uncertainty: val_aod_punto.get('AOD_Uncertainty'),
        timestamp: ee.Date(imagen.get('system:time_end')), 
        hour_day: imagen.get('hour_day')
        
      }
    );
  };
  
  var all_val_point = estaciones_table.map(val_puntos_img);
  var list_all_val_point = all_val_point.toList(70)//// Este valor se deberia ajustar si la lista de estaciones es mas grande
  return ee.FeatureCollection(
        ee.Feature(null,
          { id: imagen.get('system:id'),
            valores_imagen:list_all_val_point
          }
        )
      );

};


//// Probar la funcion usando la primera imgen
var test_im_f1=val_puntos_collection(segmento_contiene.first());
var test_im_f1_valores = ee.FeatureCollection(test_im_f1);

print('sobre primera imagen y red: ',
      test_im_f1
      );
      
      
      
      
var esta_red_todos = segmento_contiene.map(val_puntos_collection); 
var esta_red_todos_flat= esta_red_todos.flatten();
var esta_red_todos_valores = esta_red_todos_flat.aggregate_array('valores_imagen')
print('todoe en las estaciones:',
      esta_red_todos_valores.flatten()
        
    )   

Export.table.toDrive({
  collection: ee.FeatureCollection(esta_red_todos_valores.flatten()),
  folder: 'Modis',
  fileNamePrefix: 'red_estaciones_todos',
  fileFormat: 'CSV',
  selectors: ['id', 'Optical_Depth_047', 'AOD_Uncertainty','hour_day', 'timestamp'],
  }
);




