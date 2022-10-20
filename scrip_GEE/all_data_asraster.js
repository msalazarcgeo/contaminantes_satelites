var land_eras =  ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY");
var pol_mexico = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
  .filter(ee.Filter.eq('country_na', 'Mexico')); 
  
var AOD_MODIS =  ee.ImageCollection("MODIS/006/MCD19A2_GRANULES").filter(
            ee.Filter.date('2018-01-01', '2018-02-01')
            ).filterBounds(pol_mexico);

var project_modis = AOD_MODIS.first().select('Optical_Depth_047').projection();
var project_land = land_eras.first().projection();
print('Proyeccion',raster_AOD.projection().nominalScale() ) /// Esto es del raster pero 
//Podemos usar la proyeccion de Modis directamente
print('Projeccion Modis',project_modis.nominalScale() ) /// MODIS
print('Projeccion climate',project_land.nominalScale() ) /// MODIS
// Queremos cambiar de la projeccion de Climate a modis  
var scale_fac = ee.Number(project_modis.nominalScale()/project_land.nominalScale());
print('Factor Scale', scale_fac);
print('Factor Scale', project_modis.nominalScale()/project_land.nominalScale());
var dataset_clima_mexico =  land_eras.filter(ee.Filter.date('2018-01-01', '2018-02-01')).filterBounds(pol_mexico);

var visParams= {bands:['Optical_Depth_047'],  // "Blue"],
                min: 0,
                max: 500.0,
                palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};


//Map.addLayer(raster_AOD,
//              visParams_ras_aod,
//              "AOD");




//// A function to obtain the value of the hour from the timestamp and add the time as property  
function add_hour(img){
    var date  = ee.Date(img.get('system:time_start'));
    var hour_day = date.get('hour');
    return img.set('hour_day', hour_day);
}

/// apply the function 
var data_set_hour = dataset_clima_mexico.map(add_hour);
var AOD_MODIS_hour = AOD_MODIS.map(add_hour);
/// filter the images greather or equal  than 14 hours 10 am in CDMX 
var data_set_filter_hour= data_set_hour.filter(ee.Filter.gte('hour_day', 14));
var AOD_MODIS_filter_hour= AOD_MODIS_hour.filter(ee.Filter.gte('hour_day', 14));
/// filter less or equal than 21 
var data_set_filter_hour = data_set_filter_hour.filter(ee.Filter.lte('hour_day', 18));
var AOD_MODIS_filter_hour = AOD_MODIS_filter_hour.filter(ee.Filter.lte('hour_day', 18));


dataset_clima_mexico = data_set_filter_hour /// Ya estan filtradas por hora 
var AOD_MODIS_mexico = AOD_MODIS_filter_hour
//Map.addLayer(AOD_MODIS_mexico.first(), visParams, "AOD_first ");

var bb_zmvm = ZMVM_table.geometry().bounds();
//var zmvm_mean=  AOD_mean.clip(bb_zmvm)
var  clip_zmvm= function clip_ZMVM(img){
    return img.clip(bb_zmvm);
};

dataset_clima_mexico = dataset_clima_mexico.map(clip_zmvm);
AOD_MODIS_mexico = AOD_MODIS_mexico.map(clip_zmvm);
print('Climaticos',dataset_clima_mexico);
print('AOD', AOD_MODIS_mexico);


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


//Map.addLayer(dataset_time_mexico.first(), visualization, "Air temperature [K] at 2m height");

/// The pourpose for this reprojection is to use it on the same scale.

var projection_land_mod =  project_land.scale(0.083191088, 0.083191088);///This is because the number of scale fact 
print('Projection resample scale', projection_land_mod.nominalScale())
print('Projection to resample ', projection_land_mod)
var image_2 = dataset_clima_mexico.first().resample('bilinear').reproject(projection_land_mod).reproject(project_modis);

print('Projection final scale in metters',image_2.projection().nominalScale() )
print('The final Proyection', image_2.projection())
//Map.addLayer(AOD_image, visParams, "AOD_first ");
var AOD_image= AOD_MODIS_mexico.select('Optical_Depth_047').mean();
//print(AOD_MODIS_mexico.first())
var leftMap = ui.Map();
var rightMap = ui.Map();
///Right Panel
rightMap.addLayer(AOD_image,visParams,"AOD");
rightMap.addLayer(dataset_clima_mexico.first(), visualization, 'original image');
//Left panel
leftMap.addLayer(AOD_image,visParams,"AOD");
leftMap.addLayer(image_2, visualization, 'Resample');

// Create a SplitPanel to hold the adjacent, linked maps.
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true
});
var linker = ui.Map.Linker([leftMap, rightMap]);
ui.root.widgets().reset([splitPanel]);
leftMap.centerObject(bb_zmvm);

