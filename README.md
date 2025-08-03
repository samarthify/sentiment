# Sentiment Analysis Agent

An advanced Agentic AI system for autonomous data collection, real-time sentiment analysis, and actionable insights generation.

## Project Structure

```
sentiment-analysis/
├── src/                      # Source code
│   ├── agent/               # Agent core functionality
│   ├── collectors/          # Data collection modules
│   ├── processing/          # Data processing and analysis
│   ├── api/                 # API service
│   └── utils/               # Utility functions
├── data/                    # Data storage
│   ├── raw/                # Raw collected data
│   ├── processed/          # Processed data
│   └── metrics/            # System metrics and history
├── config/                 # Configuration files
│   ├── default_config.json # Default system configuration
│   ├── llm_config.json     # LLM configuration
│   ├── .env                # Environment variables
│   └── .env.example        # Example environment configuration
├── logs/                   # System logs
│   └── archive/           # Archived logs
├── models/                # ML models
│   └── sentiment/        # Sentiment analysis models
├── tests/                 # Test files
├── dashboard/            # React dashboard
│   ├── src/              # Dashboard source code
│   ├── public/           # Public assets
│   └── build/            # Production build
└── requirements.txt      # Python dependencies

## Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
cd dashboard && npm install
```

3. Configure the system:
- Copy `config/.env.example` to `config/.env`
- Add your API keys and credentials
- Adjust settings in `config/default_config.json` if needed

## Running the System

1. Start the Agent:
```bash
python -m src.agent.core
```

2. Start the API Service:
```bash
python -m src.api.service
```

3. Start the Dashboard:
```bash
cd dashboard && npm start
```

## Features

- Multi-source data collection (X, News, Instagram, LinkedIn, etc.)
- Real-time sentiment analysis with advanced NLP models
- Automated data processing and cleanup
- Interactive dashboard with real-time updates
- Historical data comparison with visualization reports
- Configurable data retention and processing intervals
- Automatic log rotation and archiving
- System health monitoring
- Websocket support for real-time updates

## Configuration

The system can be configured through `config/default_config.json`:

```json
{
    "collection_interval_minutes": 30,
    "processing_interval_minutes": 60,
    "data_retention_days": 30,
    "monitoring": {
        "min_data_points": 100,
        "max_duplicate_ratio": 0.2,
        "sentiment_threshold": 0.7
    },
    "sources": {
        "x": true,
        "news": true,
        "instagram": true,
        "linkedin": true,
        "mention": true,
        "social_searcher": true
    }
}
```

## Environment Variables

Key environment variables (defined in `.env`):
- API credentials for data sources
- Database connection settings
- SMTP configuration for notifications
- LLM API keys and settings

## Dependencies

Main dependencies include:
- **Data Processing**: numpy, pandas, scikit-learn
- **Machine Learning**: transformers, torch, sentence-transformers
- **Web/API**: fastapi, uvicorn, websockets
- **Data Collection**: selenium, beautifulsoup4
- **Utilities**: python-dotenv, schedule, tqdm

## API Endpoints

- `GET /metrics` - Get current metrics and analysis results
- `GET /latest-data` - Get most recent processed data
- `GET /config` - Get current configuration
- `POST /config` - Update configuration
- `WS /ws` - WebSocket endpoint for real-time updates

## Development

- Add new collectors in `src/collectors/`
- Add new processing modules in `src/processing/`
- Add utility functions in `src/utils/`
- Add tests in `tests/`
- Update dashboard components in `dashboard/src/components/`

## Email Configuration

### Using Proton Mail

The system supports both Proton Mail and Gmail for sending email notifications. To configure Proton Mail:

1. Create a Proton Mail account if you don't already have one.
2. Set up the following in your `config/.env` file:

```
EMAIL_PROVIDER=protonmail
SMTP_SERVER=smtp.protonmail.ch
SMTP_PORT=587
SMTP_USERNAME=your-protonmail-address@protonmail.com
SMTP_PASSWORD=your-protonmail-password
SENDER_EMAIL=your-protonmail-address@protonmail.com
```

3. For Proton Mail, make sure you have enabled SMTP/IMAP access in your Proton Mail account settings.
4. You may need to generate an app-specific password for SMTP access.

To test your Proton Mail configuration, use the API endpoint:

```
POST /email/protonmail-test
{
  "recipient": "test@example.com"
}
```

You can also switch between Gmail and Proton Mail through the dashboard's email configuration section.

## License

MIT License 