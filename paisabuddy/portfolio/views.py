from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from .models import Stock, Portfolio, PortfolioStock, Transaction
import json
import random
from decimal import Decimal

def portfolio_simulator(request):
    # Get or create a portfolio
    portfolio, created = Portfolio.objects.get_or_create(id=1)
    
    # Get portfolio stocks
    portfolio_stocks = PortfolioStock.objects.filter(portfolio=portfolio)
    
    # Get some sample stocks if none exist
    stocks = Stock.objects.all()
    if not stocks.exists():
        sample_stocks = [
            {"symbol": "RELIANCE", "name": "Reliance Industries", "price": 2500.00},
            {"symbol": "TCS", "name": "Tata Consultancy Services", "price": 3200.00},
            {"symbol": "INFY", "name": "Infosys", "price": 1500.00},
            {"symbol": "HDFCBANK", "name": "HDFC Bank", "price": 1600.00},
            {"symbol": "ICICIBANK", "name": "ICICI Bank", "price": 900.00},
        ]
        for stock_data in sample_stocks:
            Stock.objects.create(
                symbol=stock_data["symbol"],
                name=stock_data["name"],
                current_price=stock_data["price"]
            )
        stocks = Stock.objects.all()
    
    context = {
        'portfolio': portfolio,
        'portfolio_stocks': portfolio_stocks,
        'stocks': stocks,
    }
    
    return render(request, 'portfolio/simulator.html', context)

def get_stock_data(request):
    symbol = request.GET.get('symbol')
    if symbol:
        try:
            stock = Stock.objects.get(symbol=symbol)
            return JsonResponse({
                'symbol': stock.symbol,
                'name': stock.name,
                'price': float(stock.current_price)
            })
        except Stock.DoesNotExist:
            return JsonResponse({'error': 'Stock not found'}, status=404)
    else:
        stocks = Stock.objects.all()
        return JsonResponse({
            'stocks': [
                {
                    'symbol': stock.symbol,
                    'name': stock.name,
                    'price': float(stock.current_price)
                } for stock in stocks
            ]
        })

def update_stock_prices(request):
    stocks = Stock.objects.all()
    updated_stocks = []
    
    for stock in stocks:
        # Simulate price movement (±2%)
        change_percent = random.uniform(-2, 2)
        new_price = float(stock.current_price) * (1 + change_percent/100)
        stock.current_price = round(Decimal(new_price), 2)
        stock.save()
        
        updated_stocks.append({
            'symbol': stock.symbol,
            'price': float(stock.current_price)
        })
    
    return JsonResponse({'stocks': updated_stocks})

def buy_stock(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        symbol = data.get('symbol')
        quantity = int(data.get('quantity', 0))
        price = Decimal(data.get('price', 0))
        
        if quantity <= 0:
            return JsonResponse({'error': 'Invalid quantity'}, status=400)
        
        portfolio, created = Portfolio.objects.get_or_create(id=1)
        stock = get_object_or_404(Stock, symbol=symbol)
        
        # Check if user has enough balance
        total_cost = price * quantity
        if portfolio.balance < total_cost:
            return JsonResponse({'error': 'Insufficient balance'}, status=400)
        
        # Update portfolio balance
        portfolio.balance -= total_cost
        portfolio.save()
        
        # Update or create portfolio stock
        try:
            portfolio_stock = PortfolioStock.objects.get(portfolio=portfolio, stock=stock)
            # Calculate new average buy price
            total_value = (portfolio_stock.avg_buy_price * portfolio_stock.quantity) + (price * quantity)
            new_quantity = portfolio_stock.quantity + quantity
            portfolio_stock.avg_buy_price = total_value / new_quantity
            portfolio_stock.quantity = new_quantity
            portfolio_stock.save()
        except PortfolioStock.DoesNotExist:
            portfolio_stock = PortfolioStock.objects.create(
                portfolio=portfolio,
                stock=stock,
                quantity=quantity,
                avg_buy_price=price
            )
        
        # Record transaction
        Transaction.objects.create(
            portfolio=portfolio,
            stock=stock,
            transaction_type='BUY',
            quantity=quantity,
            price=price
        )
        
        return JsonResponse({
            'success': True,
            'balance': float(portfolio.balance),
            'portfolio_stock': {
                'symbol': stock.symbol,
                'quantity': portfolio_stock.quantity,
                'avg_buy_price': float(portfolio_stock.avg_buy_price),
                'current_price': float(stock.current_price),
                'profit_loss': float(portfolio_stock.profit_loss)
            }
        })
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

def sell_stock(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        symbol = data.get('symbol')
        quantity = int(data.get('quantity', 0))
        price = Decimal(data.get('price', 0))
        
        if quantity <= 0:
            return JsonResponse({'error': 'Invalid quantity'}, status=400)
        
        portfolio, created = Portfolio.objects.get_or_create(id=1)
        stock = get_object_or_404(Stock, symbol=symbol)
        
        try:
            portfolio_stock = PortfolioStock.objects.get(portfolio=portfolio, stock=stock)
            
            # Check if user has enough shares
            if portfolio_stock.quantity < quantity:
                return JsonResponse({'error': 'Not enough shares'}, status=400)
            
            # Update portfolio balance
            total_sale = price * quantity
            portfolio.balance += total_sale
            portfolio.save()
            
            # Update portfolio stock
            portfolio_stock.quantity -= quantity
            if portfolio_stock.quantity == 0:
                portfolio_stock.delete()
            else:
                portfolio_stock.save()
            
            # Record transaction
            Transaction.objects.create(
                portfolio=portfolio,
                stock=stock,
                transaction_type='SELL',
                quantity=quantity,
                price=price
            )
            
            return JsonResponse({
                'success': True,
                'balance': float(portfolio.balance),
                'portfolio_stock': {
                    'symbol': stock.symbol,
                    'quantity': portfolio_stock.quantity if portfolio_stock.quantity > 0 else 0,
                    'avg_buy_price': float(portfolio_stock.avg_buy_price) if portfolio_stock.quantity > 0 else 0,
                    'current_price': float(stock.current_price),
                    'profit_loss': float(portfolio_stock.profit_loss) if portfolio_stock.quantity > 0 else 0
                } if portfolio_stock.quantity > 0 else None
            })
        except PortfolioStock.DoesNotExist:
            return JsonResponse({'error': 'You do not own this stock'}, status=400)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)
