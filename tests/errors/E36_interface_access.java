interface Payment {
    double pay(double amount);
}
class Cash implements Payment {
    double pay(double amount) { return amount; }
}
abstract class Animal {
    abstract void sound();
}
class Dog extends Animal {
    void sound(String s) { }
}
public class Main {
    public static void main(String[] args) {
        Payment p = new Cash();
        Animal a = new Dog();
    }
}
