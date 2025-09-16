import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';

export const getAllDepartments = async (req, res) => {
  try {
    const [departments] = await pool.execute(`
      SELECT d.*, COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.employment_status = 'Active'
      GROUP BY d.id
      ORDER BY d.name
    `);

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, budget } = req.body;
    const departmentId = uuidv4();

    await pool.execute(
      'INSERT INTO departments (id, name, code, description, budget) VALUES (?, ?, ?, ?, ?)',
      [departmentId, name, code, description || null, budget || null]
    );

    const [newDepartment] = await pool.execute(
      'SELECT * FROM departments WHERE id = ?',
      [departmentId]
    );

    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment[0]
    });
  } catch (error) {
    console.error('Create department error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Department code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};