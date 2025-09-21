from django.urls import path
from . import views

app_name = 'portfolio'

urlpatterns = [
    path('simulator/', views.portfolio_simulator, name='simulator'),
    path('api/stock-data/', views.get_stock_data, name='get_stock_data'),
    path('api/update-prices/', views.update_stock_prices, name='update_stock_prices'),
    path('api/buy/', views.buy_stock, name='buy_stock'),
    path('api/sell/', views.sell_stock, name='sell_stock'),
]