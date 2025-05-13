# Create issue
return Issue(
    message=message,
    severity=severity,
    location=location,
    category=category if category != "" else None,
    symbol=symbol,
    suggestion=suggestion,
)
