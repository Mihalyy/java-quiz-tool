abstract class Shape { abstract double area(); }
interface Drawable { void draw(); }
class Circle extends Shape { }
class Square extends Shape implements Drawable {
    double area() { return 1; }
    void draw() { }
}
public class Main {
    public static void main(String[] args) {
        Shape s = new Shape();
        Drawable d = new Drawable();
    }
}
