import pandas as pd
import folium
import json
import os

class EllevioMapGenerator:
    def __init__(self, geojson_path):
        self.geojson_path = geojson_path

    def generate_map(self, zone_price_dict):
        """
        Generates a clean, corporate-style Map (Folium).
        colors based on price relative to average.
        """
        # Center of Sweden
        m = folium.Map(location=[62.0, 15.0], zoom_start=5, tiles='cartodbpositron') # 'positron' is very clean/Ellevio-like

        # Prepare Data for Choropleth
        df = pd.DataFrame(list(zone_price_dict.items()), columns=['Zone', 'Price'])

        # Load GeoJSON
        try:
            with open(self.geojson_path, 'r', encoding='utf-8') as f:
                geo_data = json.load(f)
        except Exception as e:
            print(f"GeoJSON Load Error: {e}")
            return None

        # Add Choropleth Layer
        folium.Choropleth(
            geo_data=geo_data,
            name='Elpriser (Day-Ahead)',
            data=df,
            columns=['Zone', 'Price'],
            key_on='feature.id',
            fill_color='YlGn', # Yellow to Green (or Red for high prices if reversed) - Ellevio uses Green mostly
            fill_opacity=0.6,
            line_opacity=0.2,
            legend_name='Pris (€/MWh)',
            highlight=True
        ).add_to(m)

        # Add clean tooltips
        style_function = lambda x: {
            'fillColor': '#ffffff', 
            'color': '#000000', 
            'fillOpacity': 0.1, 
            'weight': 0.1
        }
        highlight_function = lambda x: {
            'fillColor': '#000000', 
            'color': '#000000', 
            'fillOpacity': 0.50, 
            'weight': 0.1
        }
        
        NIL = folium.features.GeoJson(
            geo_data,
            style_function=style_function, 
            control=False,
            highlight_function=highlight_function, 
            tooltip=folium.features.GeoJsonTooltip(
                fields=['name'],
                aliases=['Område: '],
                style=("background-color: white; color: #333333; font-family: arial; font-size: 12px; padding: 10px;")
            )
        )
        m.add_child(NIL)

        return m
