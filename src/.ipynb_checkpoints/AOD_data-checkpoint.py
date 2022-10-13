# AUTOGENERATED! DO NOT EDIT! File to edit: ../notebooks/Clean_AOD_data.ipynb.

# %% auto 0
__all__ = ['load_AOD_data', 'load_PM25', 'merge_AOD_PM25']

# %% ../notebooks/Clean_AOD_data.ipynb 35
def load_AOD_data(path, local_time = 'America/Mexico_City'):
    """ Loading  and cleaning the data from the AOD. 
    The AOD is on UTC, if not please make a new version of this function  
    """
    AOD_time  = pd.read_csv(path)
    AOD_time = AOD_time[ AOD_time['Optical_Depth_047'].isna()== False]
    AOD_time['Estacion']= AOD_time['id']
    AOD_time.drop(columns='id', inplace=True)
    
    AOD_time['TIME_STAMP'] = pd.to_datetime(AOD_time['timestamp']) ### 
    ### Change time zone 
    print('Converting to local time: ', local_time)
    if local_time!= None:
        
        AOD_time['Local_time']= AOD_time['TIME_STAMP'].dt.tz_localize('UTC').dt.tz_convert(local_time)
    #tz_localize('utc').tz_convert('America/Mexico_City')
    
    else: 
        AOD_time['Local_time']= AOD_time['TIME_STAMP']
        
    AOD_time['Local_time'+'_hour'] = AOD_time['Local_time'].apply(lambda l: l.hour)
    AOD_time['Local_time'+'_date'] = AOD_time['Local_time'].apply(lambda l: l.date)
    
    return AOD_time


# %% ../notebooks/Clean_AOD_data.ipynb 36
def load_PM25(path, initial_interval, end_interval, zona_metropoli = 'ZMVM'):
    """Loading and cleaning the data from the PM 25 
    """
    pm2_5_esta =  pd.read_csv(path, sep =';')## Load
    pm2_5_esta.drop(columns='Unnamed: 0',  inplace = True) #drop 
    pm2_5_esta= pm2_5_esta[pm2_5_esta['VALOR'].isna() ==False] #drop NaN values 
    pm2_5_esta.FECHA= pd.to_datetime(pm2_5_esta.FECHA) #to datetime
    pm2_5_esta_interval=  pm2_5_esta[(pm2_5_esta.FECHA > pd.to_datetime(initial_interval)) &
                                     (pm2_5_esta.FECHA < pd.to_datetime(end_interval))] ### get interval 
    pm2_5_esta_interval= pm2_5_esta_interval[pm2_5_esta_interval['CVE_EST'].apply(lambda l: zona_metropoli in l)]
    pm2_5_esta_interval['Estacion'] = pm2_5_esta_interval['CVE_EST'].apply(lambda l: l.split('_')[0])
    pm2_5_esta_interval['FECHA_date']= pm2_5_esta_interval['FECHA'].apply(lambda l: l.date())
    
    
    return pm2_5_esta_interval



# %% ../notebooks/Clean_AOD_data.ipynb 37
def merge_AOD_PM25(df_AOD, df_PM25 ):
    """
    Merge the table from the AOD data and the PM 2.5 from stations 
    """
    AOD_PM25_esta =  df_AOD.merge(df_PM25,
                                  how= 'left',
                                  right_on = ['Estacion','HORA', 'FECHA_date' ],
                                  left_on=['Estacion','Local_time_hour' ,'Local_time_date' ]
                                 )
    AOD_PM25_esta=  AOD_PM25_esta[AOD_PM25_esta['VALOR'].isna()==False]
    
    return AOD_PM25_esta
    
