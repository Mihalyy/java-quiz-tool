import java.util.ArrayList;
import java.util.Scanner;

class Employee {
    protected String name;
    protected int baseSalary;

    public Employee(String name, int baseSalary) {
        this.name = name;
        this.baseSalary = baseSalary;
    }

    public int calculateSalary() {
        return baseSalary;
    }

    public String getRole() {
        return "Employee";
    }

    public void display() {
        System.out.println(getRole() + " - " + name + " - Rp " + calculateSalary());
    }
}

class Cashier extends Employee {
    private int shiftCount;

    public Cashier(String name, int baseSalary, int shiftCount) {
        super(name, baseSalary);
        this.shiftCount = shiftCount;
    }

    @Override
    public int calculateSalary() {
        return baseSalary + shiftCount * 75000;
    }

    @Override
    public String getRole() {
        return "Cashier";
    }
}

class Supervisor extends Employee {
    private int bonusPercent;

    public Supervisor(String name, int baseSalary, int bonusPercent) {
        super(name, baseSalary);
        this.bonusPercent = bonusPercent;
    }

    @Override
    public int calculateSalary() {
        return baseSalary + baseSalary * bonusPercent / 100;
    }

    @Override
    public String getRole() {
        return "Supervisor";
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Employee> staff = new ArrayList<>();

        int n = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < n; i++) {
            String[] p = sc.nextLine().split(";");
            int base = Integer.parseInt(p[2]);
            int extra = Integer.parseInt(p[3]);
            if (p[0].equals("C")) {
                staff.add(new Cashier(p[1], base, extra));
            } else {
                staff.add(new Supervisor(p[1], base, extra));
            }
        }

        int total = 0;
        for (Employee e : staff) {
            e.display();
            total += e.calculateSalary();
        }
        System.out.println("Total salary: Rp " + total);
    }
}
