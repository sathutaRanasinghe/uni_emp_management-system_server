import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';

export const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, d.name as department_name, m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department) {
      query += ` AND e.department_id = ?`;
      params.push(department);
    }

    if (status) {
      query += ` AND e.employment_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [employees] = await pool.execute(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM employees e WHERE 1=1`;
    const countParams = [];

    if (search) {
      countQuery += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department) {
      countQuery += ` AND e.department_id = ?`;
      countParams.push(department);
    }

    if (status) {
      countQuery += ` AND e.employment_status = ?`;
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const [employees] = await pool.execute(`
      SELECT e.*, d.name as department_name, m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ?
    `, [id]);

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employees[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const employeeData = req.body;
    const employeeId = uuidv4();

    // Generate employee ID (format: EMP-YYYY-####)
    const year = new Date().getFullYear();
    const [lastEmployee] = await pool.execute(
      'SELECT employee_id FROM employees WHERE employee_id LIKE ? ORDER BY employee_id DESC LIMIT 1',
      [`EMP-${year}-%`]
    );

    let nextNumber = 1;
    if (lastEmployee.length > 0) {
      const lastNumber = parseInt(lastEmployee[0].employee_id.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const generatedEmployeeId = `EMP-${year}-${nextNumber.toString().padStart(4, '0')}`;

    const insertQuery = `
      INSERT INTO employees (
        id, employee_id, first_name, last_name, email, phone, date_of_birth,
        gender, address, city, state, postal_code, country, department_id,
        job_title, employment_type, employment_status, hire_date, salary,
        currency, manager_id, national_insurance_number, passport_number,
        visa_status, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employeeId,
      generatedEmployeeId,
      employeeData.first_name,
      employeeData.last_name,
      employeeData.email,
      employeeData.phone || null,
      employeeData.date_of_birth || null,
      employeeData.gender || null,
      employeeData.address || null,
      employeeData.city || null,
      employeeData.state || null,
      employeeData.postal_code || null,
      employeeData.country || 'UK',
      employeeData.department_id || null,
      employeeData.job_title || null,
      employeeData.employment_type || 'Full-time',
      employeeData.employment_status || 'Active',
      employeeData.hire_date,
      employeeData.salary || null,
      employeeData.currency || 'GBP',
      employeeData.manager_id || null,
      employeeData.national_insurance_number || null,
      employeeData.passport_number || null,
      employeeData.visa_status || null,
      employeeData.emergency_contact_name || null,
      employeeData.emergency_contact_phone || null,
      employeeData.emergency_contact_relationship || null,
      employeeData.notes || null
    ];

    await pool.execute(insertQuery, values);

    // Retrieve the created employee with department info
    const [newEmployee] = await pool.execute(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `, [employeeId]);

    res.status(201).json({
      message: 'Employee created successfully',
      employee: newEmployee[0]
    });
  } catch (error) {
    console.error('Create employee error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;

    const updateQuery = `
      UPDATE employees SET
        first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?,
        gender = ?, address = ?, city = ?, state = ?, postal_code = ?, country = ?,
        department_id = ?, job_title = ?, employment_type = ?, employment_status = ?,
        hire_date = ?, salary = ?, currency = ?, manager_id = ?,
        national_insurance_number = ?, passport_number = ?, visa_status = ?,
        emergency_contact_name = ?, emergency_contact_phone = ?,
        emergency_contact_relationship = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      employeeData.first_name,
      employeeData.last_name,
      employeeData.email,
      employeeData.phone || null,
      employeeData.date_of_birth || null,
      employeeData.gender || null,
      employeeData.address || null,
      employeeData.city || null,
      employeeData.state || null,
      employeeData.postal_code || null,
      employeeData.country || 'UK',
      employeeData.department_id || null,
      employeeData.job_title || null,
      employeeData.employment_type || 'Full-time',
      employeeData.employment_status || 'Active',
      employeeData.hire_date,
      employeeData.salary || null,
      employeeData.currency || 'GBP',
      employeeData.manager_id || null,
      employeeData.national_insurance_number || null,
      employeeData.passport_number || null,
      employeeData.visa_status || null,
      employeeData.emergency_contact_name || null,
      employeeData.emergency_contact_phone || null,
      employeeData.emergency_contact_relationship || null,
      employeeData.notes || null,
      id
    ];

    const [result] = await pool.execute(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Retrieve the updated employee
    const [updatedEmployee] = await pool.execute(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `, [id]);

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee[0]
    });
  } catch (error) {
    console.error('Update employee error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM employees WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeStats = async (req, res) => {
  try {
    // Get total employees
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM employees');
    
    // Get employees by status
    const [statusResult] = await pool.execute(`
      SELECT employment_status, COUNT(*) as count 
      FROM employees 
      GROUP BY employment_status
    `);
    
    // Get employees by department
    const [deptResult] = await pool.execute(`
      SELECT d.name as department_name, COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      GROUP BY d.id, d.name
    `);
    
    // Get recent hires (last 30 days)
    const [recentHires] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE hire_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    res.json({
      totalEmployees: totalResult[0].total,
      statusDistribution: statusResult,
      departmentDistribution: deptResult,
      recentHires: recentHires[0].count
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};