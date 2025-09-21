from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from .models import Category, Transaction
from django.db.models import Sum

def index(request):
    categories = Category.objects.all()
    transactions = Transaction.objects.all().order_by('-date')
    income = Transaction.objects.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0
    expenses = Transaction.objects.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0
    balance = income - expenses
    
    context = {
        'categories': categories,
        'transactions': transactions,
        'income': income,
        'expenses': expenses,
        'balance': balance
    }
    return render(request, 'budget/index.html', context)

def add_transaction(request):
    if request.method == 'POST':
        amount = request.POST.get('amount')
        description = request.POST.get('description')
        category_id = request.POST.get('category')
        transaction_type = request.POST.get('transaction_type')
        date = request.POST.get('date')
        
        category = get_object_or_404(Category, id=category_id)
        
        Transaction.objects.create(
            amount=amount,
            description=description,
            category=category,
            transaction_type=transaction_type,
            date=date
        )
        
        return redirect('index')
    
    categories = Category.objects.all()
    return render(request, 'budget/add_transaction.html', {'categories': categories})
