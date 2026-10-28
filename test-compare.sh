
#!/bin/bash
echo "Creating dummy files..."
echo "This agreement is between Party A and Party B. Liability is limited to $1000. Jurisdiction: New York." > docA.txt
echo "This agreement is between Party A and Party B. Liability is limited to $5000. Jurisdiction: California." > docB.txt

echo "Sending request to /api/compare..."
curl -X POST -F "fileA=@docA.txt" -F "fileB=@docB.txt" http://localhost:3000/api/compare

echo ""
# Cleanup
rm docA.txt
rm docB.txt
