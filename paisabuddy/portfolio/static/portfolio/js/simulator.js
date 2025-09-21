document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const stockSearch = document.getElementById('stock-search');
    const stockSuggestions = document.getElementById('stock-suggestions');
    const selectedStockInfo = document.getElementById('selected-stock-info');
    const stockName = document.getElementById('stock-name');
    const stockPrice = document.getElementById('stock-price');
    const stockSymbol = document.getElementById('stock-symbol');
    const tradeForm = document.getElementById('trade-form');
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('price');
    const totalCost = document.getElementById('total-cost');
    const buyBtn = document.getElementById('buy-btn');
    const sellBtn = document.getElementById('sell-btn');
    const balanceDisplay = document.getElementById('balance');
    const portfolioTableBody = document.getElementById('portfolio-table-body');
    
    // TradingView Lightweight Charts setup
    const chartContainer = document.getElementById('candlestick-container');
    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: 400,
        layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
        },
        grid: {
            vertLines: {
                color: 'rgba(197, 203, 206, 0.5)',
            },
            horzLines: {
                color: 'rgba(197, 203, 206, 0.5)',
            },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
        },
        timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
            timeVisible: true,
        },
    });
    
    // Create candlestick series
    const candleSeries = chart.addCandlestickSeries({
        upColor: 'rgba(75, 192, 75, 1)',
        downColor: 'rgba(255, 99, 132, 1)',
        borderDownColor: 'rgba(255, 99, 132, 1)',
        borderUpColor: 'rgba(75, 192, 75, 1)',
        wickDownColor: 'rgba(255, 99, 132, 1)',
        wickUpColor: 'rgba(75, 192, 75, 1)',
    });
    
    // Add marker series for patterns
    const markerSeries = chart.addLineSeries({
        lineWidth: 0,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        chart.applyOptions({
            width: chartContainer.clientWidth,
        });
    });
    
    // Global variables
    let stocks = [];
    let selectedStock = null;
    let chartData = [];
    let updateInterval;
    let transactions = [];
    
    // Fetch all stocks
    async function fetchStocks() {
        try {
            const response = await fetch('/portfolio/api/stock-data/');
            const data = await response.json();
            stocks = data.stocks;
            
            // Initialize with first stock if available
            if (stocks.length > 0) {
                selectStock(stocks[0]);
            }
        } catch (error) {
            console.error('Error fetching stocks:', error);
        }
    }
    
    // Initialize stock data
    fetchStocks();
    
    // Add event listeners to portfolio stock rows
function setupPortfolioRowListeners() {
    const portfolioRows = document.querySelectorAll('.portfolio-stock-row');
    portfolioRows.forEach(row => {
        row.addEventListener('click', function() {
            const symbol = this.getAttribute('data-symbol');
            const stock = stocks.find(s => s.symbol === symbol);
            if (stock) {
                selectStock(stock);
                
                // Filter transaction history for this stock
                filterTransactionsByStock(stock);
                
                // Scroll to chart
                document.getElementById('candlestick-container').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Function to generate sample data for chart initialization
function generateSampleData() {
    const sampleData = [];
    const now = new Date();
    let price = 100;
    
    for (let i = 30; i >= 0; i--) {
        const time = Math.floor((now.getTime() - i * 60000) / 1000);
        const volatility = price * 0.02;
        
        const open = price;
        const close = open * (1 + (Math.random() * 0.04 - 0.02));
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        
        price = close;
        
        sampleData.push({
            time: time,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2))
        });
    }
    
    return sampleData;
}

// Function to update transaction history display
function updateTransactionHistory() {
    const tbody = document.getElementById('transaction-history-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => b.date - a.date);
    
    // Display transactions
    if (sortedTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center py-4">No transactions found</td>
        `;
        tbody.appendChild(row);
    } else {
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(transaction.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Set row color based on transaction type
            if (transaction.type === 'buy') {
                row.classList.add('table-success');
            } else {
                row.classList.add('table-danger');
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.stock.symbol}</td>
                <td>${transaction.type.toUpperCase()}</td>
                <td>${transaction.quantity}</td>
                <td>₹${transaction.price.toFixed(2)}</td>
                <td>₹${transaction.total.toFixed(2)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Reset transaction history title
    const historyTitle = document.getElementById('transaction-history-title');
    if (historyTitle) {
        historyTitle.textContent = 'Transaction History';
    }
}
    
    // Filter transaction history by selected stock
function filterTransactionsByStock(stock) {
    const tbody = document.getElementById('transaction-history-body');
    tbody.innerHTML = '';
    
    // Filter transactions for this stock
    const filteredTransactions = transactions.filter(t => t.stock.symbol === stock.symbol);
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => b.date - a.date);
    
    // Display transactions
    if (sortedTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center py-4">No transactions found for ${stock.symbol}</td>
        `;
        tbody.appendChild(row);
    } else {
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(transaction.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            // Set row color based on transaction type
            if (transaction.type === 'buy') {
                row.classList.add('table-success');
            } else {
                row.classList.add('table-danger');
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.stock.symbol}</td>
                <td>${transaction.type.toUpperCase()}</td>
                <td>${transaction.quantity}</td>
                <td>₹${transaction.price.toFixed(2)}</td>
                <td>₹${transaction.total.toFixed(2)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Update transaction history title
    const historyTitle = document.getElementById('transaction-history-title');
    if (historyTitle) {
        historyTitle.textContent = `Transaction History - ${stock.symbol}`;
    }
}
    
    // Function to add transaction marker to chart
    function addTransactionMarker(transaction) {
        if (!chart || !candleSeries) return;
        
        // Find the closest data point to the current time
        const currentTime = new Date().getTime() / 1000;
        let closestPoint = chartData[0];
        let minDiff = Math.abs(closestPoint.time - currentTime);
        
        for (let i = 1; i < chartData.length; i++) {
            const diff = Math.abs(chartData[i].time - currentTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestPoint = chartData[i];
            }
        }
        
        // Add marker
        const markerColor = transaction.type === 'buy' ? '#4CAF50' : '#F44336';
        const position = transaction.type === 'buy' ? 'belowBar' : 'aboveBar';
        const shape = transaction.type === 'buy' ? 'arrowUp' : 'arrowDown';
        
        candleSeries.setMarkers([
            ...candleSeries.markers() || [],
            {
                time: closestPoint.time,
                position: position,
                color: markerColor,
                shape: shape,
                text: `${transaction.type.toUpperCase()} ${transaction.quantity} @ ₹${transaction.price.toFixed(2)}`
            }
        ]);
    }
    
    // Stock search functionality
    stockSearch.addEventListener('input', function() {
        const query = this.value.trim().toUpperCase();
        if (query.length === 0) {
            stockSuggestions.innerHTML = '';
            stockSuggestions.classList.add('hidden');
            return;
        }
        
        const filteredStocks = stocks.filter(stock => 
            stock.symbol.includes(query) || stock.name.toUpperCase().includes(query)
        );
        
        if (filteredStocks.length > 0) {
            stockSuggestions.innerHTML = '';
            filteredStocks.forEach(stock => {
                const div = document.createElement('div');
                div.classList.add('p-2', 'cursor-pointer', 'stock-suggestion');
                div.innerHTML = `<strong>${stock.symbol}</strong> - ${stock.name}`;
                div.addEventListener('click', () => selectStock(stock));
                stockSuggestions.appendChild(div);
            });
            stockSuggestions.classList.remove('hidden');
        } else {
            stockSuggestions.innerHTML = '<div class="p-2">No stocks found</div>';
            stockSuggestions.classList.remove('hidden');
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== stockSearch && !stockSuggestions.contains(e.target)) {
            stockSuggestions.classList.add('hidden');
        }
    });
    
    // Select a stock
    function selectStock(stock) {
        selectedStock = stock;
        stockName.textContent = stock.name;
        stockPrice.textContent = stock.price.toFixed(2);
        stockSymbol.textContent = stock.symbol;
        priceInput.value = stock.price.toFixed(2);
        updateTotalCost();
        
        selectedStockInfo.classList.remove('hidden');
        tradeForm.classList.remove('hidden');
        stockSuggestions.classList.add('hidden');
        
        // Reset chart data
        chartData = [];
        const now = new Date();
        let prevClose = stock.price;
        
        for (let i = 10; i >= 0; i--) {
            const time = Math.floor((now.getTime() - i * 60000) / 1000);
            // Add some random variation for candlestick data
            const volatility = stock.price * 0.02;
            
            // Generate OHLC (Open, High, Low, Close) data
            const open = prevClose;
            const close = open * (1 + (Math.random() * 0.04 - 0.02));
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            
            // Store for next iteration
            prevClose = close;
            
            // Create candlestick data point
            chartData.push({
                time: time,
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2))
            });
        }
        
        // Update the candlestick chart
        candleSeries.setData(chartData);
        
        // Detect patterns
        detectCandlestickPatterns(chartData);
        
        // Clear previous interval and start new one
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        updateInterval = setInterval(updateStockPrice, 5000);
    }
    
    // Detect candlestick patterns
    function detectCandlestickPatterns(data) {
        if (data.length < 3) return;
        
        const patterns = [];
        const lastIndex = data.length - 1;
        const lastCandle = data[lastIndex];
        const prevCandle = data[lastIndex - 1];
        const thirdLastCandle = data[lastIndex - 2];
        
        // Clear previous markers
        markerSeries.setMarkers([]);
        
        // Doji pattern (open and close are very close)
        const dojiThreshold = 0.1;
        const bodySize = Math.abs(lastCandle.open - lastCandle.close);
        const wickSize = lastCandle.high - lastCandle.low;
        
        if (bodySize / wickSize < dojiThreshold && wickSize > 0) {
            patterns.push({
                time: lastCandle.time,
                position: 'aboveBar',
                color: '#4CAF50',
                shape: 'arrowDown',
                text: 'Doji'
            });
        }
        
        // Hammer pattern (small body at the top, long lower wick)
        const hammerThreshold = 0.3;
        const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
        
        if (bodySize / wickSize < hammerThreshold && lowerWick / wickSize > 0.6) {
            patterns.push({
                time: lastCandle.time,
                position: 'belowBar',
                color: '#2196F3',
                shape: 'arrowUp',
                text: 'Hammer'
            });
        }
        
        // Engulfing pattern (current candle completely engulfs previous candle)
        if (lastCandle.open < prevCandle.close && lastCandle.close > prevCandle.open) {
            patterns.push({
                time: lastCandle.time,
                position: 'belowBar',
                color: '#FF9800',
                shape: 'arrowUp',
                text: 'Bullish Engulfing'
            });
        } else if (lastCandle.open > prevCandle.close && lastCandle.close < prevCandle.open) {
            patterns.push({
                time: lastCandle.time,
                position: 'aboveBar',
                color: '#F44336',
                shape: 'arrowDown',
                text: 'Bearish Engulfing'
            });
        }
        
        // Add markers to chart
        if (patterns.length > 0) {
            markerSeries.setMarkers(patterns);
        }
    }
    
    // Update chart with current data
    function updateChart() {
        // Update the candlestick chart with the current data
        candleSeries.setData(chartData);
        
        // Detect patterns
        detectCandlestickPatterns(chartData);
        
        // Fit content to view
        chart.timeScale().fitContent();
    }
    
    // Simulate stock price changes
    async function updateStockPrice() {
        try {
            const response = await fetch('/portfolio/api/update-prices/');
            const data = await response.json();
            
            // Update all stock prices
            data.stocks.forEach(updatedStock => {
                const stockIndex = stocks.findIndex(s => s.symbol === updatedStock.symbol);
                if (stockIndex !== -1) {
                    stocks[stockIndex].price = updatedStock.price;
                }
                
                // Update selected stock if it matches
                if (selectedStock && selectedStock.symbol === updatedStock.symbol) {
                    selectedStock.price = updatedStock.price;
                    stockPrice.textContent = updatedStock.price.toFixed(2);
                    priceInput.value = updatedStock.price.toFixed(2);
                    updateTotalCost();
                    
                    // Add new candlestick data point
                    const now = new Date();
                    const timestamp = Math.floor(now.getTime() / 1000);
                    const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : null;
                    
                    // Generate OHLC data based on previous close
                    const open = lastCandle ? lastCandle.close : updatedStock.price;
                    const close = updatedStock.price;
                    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
                    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
                    
                    const newCandle = {
                        time: timestamp,
                        open: parseFloat(open.toFixed(2)),
                        high: parseFloat(high.toFixed(2)),
                        low: parseFloat(low.toFixed(2)),
                        close: parseFloat(close.toFixed(2))
                    };
                    
                    chartData.push(newCandle);
                    
                    // Keep only the last 30 data points
                    if (chartData.length > 30) {
                        chartData.shift();
                    }
                    
                    // Update the candlestick chart
                    candleSeries.setData(chartData);
                    
                    // Detect patterns and add markers
                    detectCandlestickPatterns(chartData);
                }
                
                // Update portfolio table
                const portfolioRow = document.querySelector(`tr[data-symbol="${updatedStock.symbol}"]`);
                if (portfolioRow) {
                    const currentPriceCell = portfolioRow.querySelector('.current-price');
                    const profitLossCell = portfolioRow.querySelector('.profit-loss');
                    const quantityCell = portfolioRow.querySelector('td:nth-child(2)');
                    const avgBuyPriceCell = portfolioRow.querySelector('td:nth-child(3)');
                    
                    if (currentPriceCell && profitLossCell && quantityCell && avgBuyPriceCell) {
                        const quantity = parseInt(quantityCell.textContent);
                        const avgBuyPrice = parseFloat(avgBuyPriceCell.textContent.replace('₹', ''));
                        const currentPrice = updatedStock.price;
                        const profitLoss = (currentPrice - avgBuyPrice) * quantity;
                        
                        currentPriceCell.textContent = `₹${currentPrice.toFixed(2)}`;
                        profitLossCell.innerHTML = `<span class="${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}">₹${profitLoss.toFixed(2)}</span>`;
                    }
                }
            });
        } catch (error) {
            console.error('Error updating stock prices:', error);
        }
    }
    
    // Update total cost based on quantity and price
    function updateTotalCost() {
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        totalCost.textContent = (quantity * price).toFixed(2);
    }
    
    quantityInput.addEventListener('input', updateTotalCost);
    priceInput.addEventListener('input', updateTotalCost);
    
    // Buy stock
    buyBtn.addEventListener('click', async function() {
        if (!selectedStock) return;
        
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        
        if (quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        try {
            const response = await fetch('/portfolio/api/buy/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    symbol: selectedStock.symbol,
                    quantity: quantity,
                    price: price
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            // Update balance
            balanceDisplay.textContent = data.balance.toFixed(2);
            
            // Update or add portfolio entry
            updatePortfolioTable(data.portfolio_stock);
            
            // Record transaction
            const transaction = {
                id: Date.now(),
                date: new Date(),
                stock: selectedStock,
                type: 'buy',
                quantity: quantity,
                price: price,
                total: quantity * price
            };
            transactions.push(transaction);
            
            // Add marker to chart
            addTransactionMarker(transaction);
            
            // Update transaction history display
            updateTransactionHistory();
            
            // Reset form
            quantityInput.value = 1;
            updateTotalCost();
            
        } catch (error) {
            console.error('Error buying stock:', error);
            alert('An error occurred while buying the stock');
        }
    });
    
    // Sell stock
    sellBtn.addEventListener('click', async function() {
        if (!selectedStock) return;
        
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        
        if (quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        try {
            const response = await fetch('/portfolio/api/sell/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    symbol: selectedStock.symbol,
                    quantity: quantity,
                    price: price
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            // Update balance
            balanceDisplay.textContent = data.balance.toFixed(2);
            
            // Record transaction
            const transaction = {
                id: Date.now(),
                date: new Date(),
                stock: selectedStock,
                type: 'sell',
                quantity: quantity,
                price: price,
                total: quantity * price
            };
            transactions.push(transaction);
            
            // Add marker to chart
            addTransactionMarker(transaction);
            
            // Update transaction history display
            updateTransactionHistory();
            
            // Update or remove portfolio entry
            if (data.portfolio_stock) {
                updatePortfolioTable(data.portfolio_stock);
            } else {
                const row = document.querySelector(`tr[data-symbol="${selectedStock.symbol}"]`);
                if (row) {
                    row.remove();
                }
                
                // If portfolio is now empty, add the "No stocks" row
                if (portfolioTableBody.children.length === 0) {
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = '<td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No stocks in portfolio</td>';
                    portfolioTableBody.appendChild(emptyRow);
                }
            }
            
            // Reset form
            quantityInput.value = 1;
            updateTotalCost();
            
        } catch (error) {
            console.error('Error selling stock:', error);
            alert('An error occurred while selling the stock');
        }
    });
    
    // Update portfolio table with stock data
function updatePortfolioTable(portfolioStock) {
    // Remove "No stocks" row if it exists
    const emptyRow = portfolioTableBody.querySelector('td[colspan="5"]');
    if (emptyRow) {
        emptyRow.parentElement.remove();
    }
    
    // Check if row already exists
    let row = document.querySelector(`tr[data-symbol="${portfolioStock.symbol}"]`);
    
    if (row) {
        // Update existing row
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${portfolioStock.symbol}</div>
                <div class="text-sm text-gray-500">${selectedStock.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${portfolioStock.quantity}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹${portfolioStock.avg_buy_price.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 current-price">₹${portfolioStock.current_price.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm profit-loss">
                <span class="${portfolioStock.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ₹${portfolioStock.profit_loss.toFixed(2)}
                </span>
            </td>
        `;
    } else {
        // Create new row
        row = document.createElement('tr');
        row.setAttribute('data-symbol', portfolioStock.symbol);
        row.classList.add('portfolio-stock-row', 'cursor-pointer', 'hover:bg-gray-100');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${portfolioStock.symbol}</div>
                <div class="text-sm text-gray-500">${selectedStock.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${portfolioStock.quantity}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹${portfolioStock.avg_buy_price.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 current-price">₹${portfolioStock.current_price.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm profit-loss">
                <span class="${portfolioStock.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ₹${portfolioStock.profit_loss.toFixed(2)}
                </span>
            </td>
        `;
        portfolioTableBody.appendChild(row);
    }
    
    // Setup click listeners for portfolio rows
    setupPortfolioRowListeners();
}
    
    // Helper function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});