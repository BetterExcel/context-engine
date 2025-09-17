const fs = require('fs');
const path = require('path');

// Create a large CSV file for performance testing
function createLargeCSV() {
  const filePath = path.join(__dirname, 'files', 'large-performance-test.csv');
  const writeStream = fs.createWriteStream(filePath);
  
  // Write header
  writeStream.write('ID,Name,Email,Department,Salary,StartDate,Status,Manager,Location,Phone\n');
  
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
  const statuses = ['Active', 'Inactive', 'On Leave', 'Terminated'];
  const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
  
  // Generate 10,000 rows
  for (let i = 1; i <= 10000; i++) {
    const name = `Employee ${i}`;
    const email = `employee${i}@company.com`;
    const department = departments[i % departments.length];
    const salary = 40000 + (i % 100000);
    const startDate = new Date(2020 + (i % 4), (i % 12), (i % 28) + 1).toISOString().split('T')[0];
    const status = statuses[i % statuses.length];
    const manager = `Manager ${Math.floor(i / 10) + 1}`;
    const location = locations[i % locations.length];
    const phone = `555-${String(i).padStart(4, '0')}`;
    
    writeStream.write(`${i},${name},${email},${department},${salary},${startDate},${status},${manager},${location},${phone}\n`);
  }
  
  writeStream.end();
  console.log('Large CSV file created successfully');
}

createLargeCSV();