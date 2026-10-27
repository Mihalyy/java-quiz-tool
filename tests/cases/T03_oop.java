import java.util.*;
abstract class Shape implements Comparable<Shape> {
    private static int count = 0;
    protected String name;
    public Shape(String name) { this.name = name; count++; }
    public abstract double area();
    public String describe() { return name + " area=" + String.format("%.2f", area()); }
    public static int getCount() { return count; }
    @Override public int compareTo(Shape o) { return Double.compare(area(), o.area()); }
    @Override public String toString() { return "Shape[" + name + "]"; }
}
class Circle extends Shape {
    private double r;
    public Circle(double r) { super("Circle"); this.r = r; }
    public double area() { return Math.PI * r * r; }
}
class Rect extends Shape {
    protected double w, h;
    public Rect(double w, double h) { super("Rect"); this.w = w; this.h = h; }
    public Rect(double s) { this(s, s); name = "Square"; }
    public double area() { return w * h; }
    @Override public String describe() { return "[R] " + super.describe(); }
}
interface Greeter { String greet(String n); default String hello() { return greet("world"); } }
class Animal {
    String sound() { return "..."; }
    void speak() { System.out.println(getClass().getSimpleName() + " says " + sound()); }
}
class Dog extends Animal { @Override String sound() { return "Woof"; } }
class Cat extends Animal { String sound() { return "Meow"; } }
class Counter {
    private int value;
    public Counter increment() { value++; return this; }
    public int get() { return value; }
}
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) { if (!(o instanceof Point)) return false; Point p = (Point) o; return x == p.x && y == p.y; }
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public String toString() { return "(" + x + "," + y + ")"; }
}
enum Level { LOW, MEDIUM("mid"), HIGH; private String label; Level() { label = name().toLowerCase(); } Level(String l) { label = l; } String getLabel() { return label; } }
public class Main {
    static int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
    public static void main(String[] args) {
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Circle(1.5)); shapes.add(new Rect(2, 3)); shapes.add(new Rect(2));
        for (Shape s : shapes) System.out.println(s.describe() + " " + s);
        Collections.sort(shapes);
        System.out.println(shapes + " count=" + Shape.getCount());
        Greeter g = n -> "Hi " + n;
        System.out.println(g.greet("Ann") + " / " + g.hello());
        Greeter anon = new Greeter() { public String greet(String n) { return "Yo " + n; } };
        System.out.println(anon.hello());
        Animal[] zoo = { new Dog(), new Cat(), new Animal() };
        for (Animal a : zoo) a.speak();
        System.out.println(new Counter().increment().increment().get());
        Set<Point> pts = new HashSet<>(); pts.add(new Point(1, 2)); pts.add(new Point(1, 2)); pts.add(new Point(3, 4));
        System.out.println(pts.size() + " " + pts.contains(new Point(3, 4)) + " " + new Point(1,2).equals(new Point(1,2)));
        for (Level l : Level.values()) System.out.print(l + ":" + l.ordinal() + ":" + l.getLabel() + " ");
        System.out.println();
        Level lv = Level.valueOf("HIGH");
        switch (lv) { case LOW: System.out.println("low"); break; case HIGH: System.out.println("high!"); break; default: System.out.println("other"); }
        System.out.println(fib(15));
        Object o = shapes.get(0);
        if (o instanceof Circle c) System.out.println("circle " + c.area());
        System.out.println(o instanceof Shape);
        Shape sh = shapes.get(1);
        System.out.println(sh.getClass().getName() + " " + (sh instanceof Rect));
        Runnable r = () -> System.out.println("run!"); r.run();
    }
}
