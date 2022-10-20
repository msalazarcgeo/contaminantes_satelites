var land_eras =  ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY");
var pol_mexico = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Mexico')); 
////// Vamos a ponerle otro filtro por que no deseamos todas las hora solamente deseamos las 
///// aquellas que sean similares a AOD por el momento. 
//var lar_eras_housr= land_eras.filter.(ee.Filter.date('2017-01-01', '2018-01-01'))
var dataset_time_mexico =  land_eras.filter(ee.Filter.date('2017-01-01', '2018-01-01')).filterBounds(pol_mexico);

//// A function to obtain the value of the hour from the timestamp and add the time as property  
function add_hour(img){
    var date  = ee.Date(img.get('system:time_start'));
    var hour_day = date.get('hour');
    return img.set('hour_day', hour_day);
}

/// apply the function 
var data_set_hour = dataset_time_mexico.map(add_hour);
/// filter the images greather or equal  than 14 hours 10 am in CDMX 
var data_set_filter_hour= data_set_hour.filter(ee.Filter.gte('hour_day', 14));
/// filter less or equal than 21 
var data_set_filter_hour = data_set_filter_hour.filter(ee.Filter.lte('hour_day', 21));

dataset_time_mexico = data_set_filter_hour /// Ya estan filtradas por hora 


print('Imagenes con mexico: ',dataset_time_mexico) /// En este caso no filtra nada cuando se haga 
                                                    // la predición para el modelo se tiene que ver como se toma 
                                                    // Para la obtancion de los datos nos basta. 

//print(ZMVM_table)
//var segmento_contiene = dataset_time_mexico.filterBounds(estaciones_table.geometry());
var bb_zmvm = ZMVM_table.geometry().bounds();
//var zmvm_mean=  AOD_mean.clip(bb_zmvm)
var  clip_zmvm= function clip_ZMVM(img){
    return img.clip(bb_zmvm);
};

dataset_time_mexico = dataset_time_mexico.map(clip_zmvm);
var segmento_contiene = dataset_time_mexico.filterBounds(estaciones_table.geometry());

//print('Imagenes con las estaciones:',segmento_contiene)
var visualization = {
  bands: ['temperature_2m'],
  min: 250.0,
  max: 320.0,
  palette: [
    "#000080","#0000D9","#4000FF","#8000FF","#0080FF","#00FFFF",
    "#00FF80","#80FF00","#DAFF00","#FFFF00","#FFF500","#FFDA00",
    "#FFB000","#FFA400","#FF4F00","#FF2500","#FF0A00","#FF00FF",
  ]
};



Map.addLayer(dataset_time_mexico.first(), visualization, "Air temperature [K] at 2m height");
/// Se puede ver que las imagenes contienen a los puntos por tal motivo no las filtran ,
//es decir la imagen de los rasters no esta subdividida y esta solo como una sola imagen. 

//// Extraer los valores de las imagenes 
var val_puntos_collection= function(imagen){
  var val_puntos_img= function(estacion){
    
    var val_land_punto = imagen.reduceRegion({
      geometry: estacion.geometry(),
      scale:30,
      reducer: ee.Reducer.first()
    });
    
    return ee.Feature(estacion.geometry(), 
      {
        id:estacion.get('Estacion'),
        temperature_2m: val_land_punto.get('temperature_2m'),
        total_evaporation:val_land_punto.get('total_evaporation'),
        u_component_of_wind_10m: val_land_punto.get('u_component_of_wind_10m'),
        v_component_of_wind_10m: val_land_punto.get('v_component_of_wind_10m'),
        total_precipitation: val_land_punto.get('total_precipitation'),
        leaf_area_index_high_vegetation: val_land_punto.get('leaf_area_index_high_vegetation'),
        leaf_area_index_low_vegetation: val_land_punto.get('leaf_area_index_low_vegetation'),
        total_precipitation_hourly:val_land_punto.get('total_precipitation_hourly'),
        timestamp: ee.Date(imagen.get('system:time_end'))
      }
    );
  };
  
  
  var all_val_point = ZMVM_table.map(val_puntos_img);
  var list_all_val_point = all_val_point.toList(70)//// Este valor se deberia ajustar si la lista de estaciones es mas grande
  return ee.FeatureCollection(ee.Feature(null, {id: imagen.get('system:id'),
                                                valores_imagen:list_all_val_point
                                                }
                                        )
                              );

};
//var test_im_f1=val_puntos_collection(segmento_contiene.first());
//print(test_im_f1)


var esta_red_todos = segmento_contiene.map(val_puntos_collection); 
var esta_red_todos_flat= esta_red_todos.flatten();
var esta_red_todos_valores = esta_red_todos_flat.aggregate_array('valores_imagen')

Export.table.toDrive({
  collection: ee.FeatureCollection(esta_red_todos_valores.flatten()),
  folder: 'Modis',
  fileNamePrefix: 'red_est_ERA5_LAND_HOURLY',
  fileFormat: 'CSV',
  selectors: ['id',
  'temperature_2m',
  'total_evaporation',
  'u_component_of_wind_10m',
  'v_component_of_wind_10m',
  'total_precipitation',
  'leaf_area_index_high_vegetation',
  'leaf_area_index_low_vegetation',
  'total_precipitation_hourly',
  'timestamp',
      ],
  }
);
