import pandas as pd
import folium
import json

class EnergyVisualizer:
    def __init__(self, geojson_path):
        self.geojson_path = geojson_path

    def create_price_map(self, zone_prices):
        """
        Generates a Folium map colored by price.
        zone_prices: dict like {'SE1': 45.5, 'SE2': 45.5, 'SE3': 60.2, 'SE4': 80.0}
        """
        # Center on Sweden
        m = folium.Map(location=[62.0, 15.0], zoom_start=5, tiles='CartoDB dark_matter')

        # Load GeoJSON
        with open(self.geojson_path, 'r') as f:
            geo_data = json.load(f)

        # Create a dataframe for the choropleth
        df = pd.DataFrame(list(zone_prices.items()), columns=['Zone', 'Price'])

        # Colormap
        folium.Choropleth(
            geo_data=geo_data,
            name='Spot Prices',
            data=df,
            columns=['Zone', 'Price'],
            key_on='feature.properties.id', # Assuming GeoJSON has ID 'SE1', 'SE2'...
            fill_color='YlOrRd',
            fill_opacity=0.7,
            line_opacity=0.2,
            legend_name='Price (€/MWh)',
            highlight=True
        ).add_to(m)

        # Add Hover Tooltips (can be enhanced)
        folium.LayerControl().add_to(m)

        return m

    def generate_dashboard_graphs(self, df_mix):
        """
        Generates Plotly graphs for generation mix.
        (Placeholder for graph generation code)
        """
        pass
